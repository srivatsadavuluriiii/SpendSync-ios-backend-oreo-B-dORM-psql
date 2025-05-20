/**
 * Settlement Controller
 * 
 * Handles HTTP requests related to settlements and debt optimization,
 * including suggestions, creation, and tracking of settlements.
 */

const { BadRequestError, NotFoundError } = require('../../../../shared/errors');
const settlementService = require('../services/settlement.service');
const optimizationService = require('../services/optimization.service');
const visualizationService = require('../services/visualization.service');
const { metrics, timers } = require('../config/monitoring');

/**
 * Get settlement suggestions for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getSettlementSuggestions(req, res, next) {
  try {
    const { groupId } = req.params;
    const { algorithm = 'minCashFlow', includeFriendships = 'false' } = req.query;
    
    // Start timer for algorithm execution
    const algorithmTimer = timers.createAlgorithmTimer(algorithm);

    // Get debt graph for the group
    const dbTimer = timers.createDbTimer('fetch', 'debtGraph');
    const debtGraph = await settlementService.getGroupDebtGraph(groupId);
    dbTimer();
    
    // Get exchange rates if there are multiple currencies
    const currencies = [...new Set(debtGraph.debts.map(debt => debt.currency))];
    let exchangeRates = {};
    if (currencies.length > 1) {
      exchangeRates = await settlementService.getExchangeRates(currencies);
    }
    
    // Get friendships if requested
    let friendships = null;
    if (includeFriendships === 'true') {
      const friendshipTimer = timers.createDbTimer('fetch', 'friendships');
      friendships = await settlementService.getFriendshipStrengths(groupId);
      friendshipTimer();
    }
    
    // Generate settlement suggestions based on algorithm
    let settlements;
    switch (algorithm) {
      case 'greedy':
        settlements = optimizationService.calculateGreedySettlements(debtGraph, exchangeRates);
        break;
      case 'friendOptimized':
        if (!friendships) {
          friendships = await settlementService.getFriendshipStrengths(groupId);
        }
        settlements = optimizationService.calculateFriendPreferenceSettlements(
          debtGraph, 
          exchangeRates, 
          friendships
        );
        break;
      case 'minCashFlow':
      default:
        settlements = optimizationService.calculateMinCashFlowSettlements(debtGraph, exchangeRates);
        break;
    }
    
    // Stop algorithm timer
    algorithmTimer();
    
    // Generate visualization data
    const visualization = visualizationService.generateSettlementVisualization(
      debtGraph,
      settlements
    );
    
    // Generate explanation if requested
    let explanation = null;
    if (req.query.includeExplanation === 'true') {
      explanation = visualizationService.generateSettlementExplanation(
        debtGraph,
        settlements,
        algorithm
      );
    }
    
    res.json({
      success: true,
      data: {
        settlements,
        visualization,
        explanation,
        algorithm
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new settlement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function createSettlement(req, res, next) {
  try {
    const { payerId, receiverId, amount, currency, groupId, notes } = req.body;
    const createdBy = req.user.id;
    
    // Validate required fields
    if (!payerId || !receiverId || !amount || !groupId) {
      throw new BadRequestError('Missing required fields');
    }
    
    // Create settlement data
    const settlementData = {
      payerId,
      receiverId,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      groupId,
      notes,
      createdBy,
      status: 'pending'
    };
    
    // Start timer for database operation
    const dbTimer = timers.createDbTimer('create', 'settlements');
    
    // Create the settlement
    const settlement = await settlementService.createSettlement(settlementData);
    
    // Stop timer
    dbTimer();
    
    // Track settlement creation
    metrics.settlementCreatedCounter.inc({
      status: 'pending',
      currency: settlementData.currency
    });
    
    res.status(201).json({
      success: true,
      data: settlement
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all settlements for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getGroupSettlements(req, res, next) {
  try {
    const { groupId } = req.params;
    const { status, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Start timer for database operation
    const dbTimer = timers.createDbTimer('find', 'settlements');
    
    const settlements = await settlementService.getSettlementsByGroup(
      groupId,
      status,
      parseInt(limit),
      parseInt(offset),
      sortBy,
      sortOrder
    );
    
    // Stop timer
    dbTimer();
    
    res.json({
      success: true,
      data: settlements
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single settlement by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getSettlementById(req, res, next) {
  try {
    const { settlementId } = req.params;
    
    // Start timer for database operation
    const dbTimer = timers.createDbTimer('findOne', 'settlements');
    
    const settlement = await settlementService.getSettlementById(settlementId);
    
    // Stop timer
    dbTimer();
    
    if (!settlement) {
      throw new NotFoundError(`Settlement with ID ${settlementId} not found`);
    }
    
    res.json({
      success: true,
      data: settlement
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a settlement's status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updateSettlementStatus(req, res, next) {
  try {
    const { settlementId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    // Validate status
    if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
      throw new BadRequestError('Invalid status');
    }
    
    // Get the settlement
    const dbFindTimer = timers.createDbTimer('findOne', 'settlements');
    const settlement = await settlementService.getSettlementById(settlementId);
    dbFindTimer();
    
    if (!settlement) {
      throw new NotFoundError(`Settlement with ID ${settlementId} not found`);
    }
    
    // Check if user has permission (must be payer or receiver)
    if (settlement.payerId !== userId && settlement.receiverId !== userId) {
      throw new BadRequestError('You do not have permission to update this settlement');
    }
    
    // Additional validation based on status
    if (status === 'completed') {
      // Only receiver can mark as completed
      if (settlement.receiverId !== userId) {
        throw new BadRequestError('Only the receiver can mark a settlement as completed');
      }
    } else if (status === 'cancelled') {
      // Both payer and receiver can cancel
      if (settlement.status === 'completed') {
        throw new BadRequestError('Cannot cancel a completed settlement');
      }
    }
    
    // Track the status change
    metrics.settlementStatusChangedCounter.inc({
      from: settlement.status,
      to: status
    });
    
    // Update the settlement
    const dbUpdateTimer = timers.createDbTimer('update', 'settlements');
    const updatedSettlement = await settlementService.updateSettlementStatus(
      settlementId,
      status,
      status === 'completed' ? new Date() : null
    );
    dbUpdateTimer();
    
    res.json({
      success: true,
      data: updatedSettlement
    });
  } catch (error) {
    next(error);
  }
} 