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
const userPreferenceService = require('../services/user-preference.service');

/**
 * Get settlement suggestions for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getSettlementSuggestions(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    // Get user preferences to determine algorithm and currency preferences
    const userPreferences = await userPreferenceService.getUserPreferences(userId);
    
    // Use query params if provided, otherwise use user preferences
    const algorithm = req.query.algorithm || userPreferences.settlementAlgorithm || 'minCashFlow';
    const includeFriendships = req.query.includeFriendships === 'true' || algorithm === 'friendPreference';
    
    // Get debt graph for the group
    const debtGraph = await settlementService.getGroupDebtGraph(groupId);
    
    // Determine base currency - use user's preferred currency if available
    const preferredCurrency = userPreferences.defaultCurrency;
    
    // Get all currencies used in debts
    const currencies = [...new Set(debtGraph.debts.map(debt => debt.currency))];
    
    // Add preferred currency to the list if not already included
    if (preferredCurrency && !currencies.includes(preferredCurrency)) {
      currencies.push(preferredCurrency);
    }
    
    // Get exchange rates if there are multiple currencies
    let exchangeRates = {};
    if (currencies.length > 1) {
      exchangeRates = await settlementService.getExchangeRates(currencies);
    }
    
    // Get friendships if requested or if using friend preference algorithm
    let friendships = null;
    if (includeFriendships || algorithm === 'friendPreference') {
      friendships = await settlementService.getFriendshipStrengths(groupId);
    }
    
    // Generate settlement suggestions based on algorithm
    let settlements;
    switch (algorithm) {
      case 'greedy':
        settlements = await optimizationService.calculateGreedySettlements(debtGraph, exchangeRates);
        break;
      case 'friendPreference':
        if (!friendships) {
          friendships = await settlementService.getFriendshipStrengths(groupId);
        }
        settlements = await optimizationService.calculateFriendPreferenceSettlements(
          debtGraph, 
          exchangeRates, 
          friendships
        );
        break;
      case 'minCashFlow':
      default:
        settlements = await optimizationService.calculateMinCashFlowSettlements(debtGraph, exchangeRates);
        break;
    }
    
    // If user has a preferred currency, try to standardize settlements to that currency
    if (preferredCurrency && currencies.length > 1) {
      settlements = settlements.map(settlement => {
        // If settlement is not in preferred currency and we have exchange rates
        if (settlement.currency !== preferredCurrency && exchangeRates[settlement.currency] && exchangeRates[preferredCurrency]) {
          const exchangeRate = exchangeRates[settlement.currency] / exchangeRates[preferredCurrency];
          return {
            ...settlement,
            amount: parseFloat((settlement.amount * exchangeRate).toFixed(2)),
            currency: preferredCurrency,
            originalAmount: settlement.amount,
            originalCurrency: settlement.currency,
            exchangeRate
          };
        }
        return settlement;
      });
    }
    
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
        algorithm,
        preferredCurrency: preferredCurrency || null
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
    const userId = req.user.id;
    
    // Validate required fields
    if (!payerId || !receiverId || !amount || !groupId) {
      throw new BadRequestError('Missing required fields');
    }
    
    // Get user preferences for default currency
    const userPreferences = await userPreferenceService.getUserPreferences(userId);
    
    // Create settlement data
    const settlementData = {
      payerId,
      receiverId,
      amount: parseFloat(amount),
      // Use provided currency, or user's preferred currency, or fallback to USD
      currency: currency || userPreferences.defaultCurrency || 'USD',
      groupId,
      notes,
      createdBy: userId,
      status: 'pending'
    };
    
    // Create the settlement
    const settlement = await settlementService.createSettlement(settlementData);
    
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
    
    const settlements = await settlementService.getSettlementsByGroup(
      groupId,
      status,
      parseInt(limit),
      parseInt(offset),
      sortBy,
      sortOrder
    );
    
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
    const settlement = await settlementService.getSettlementById(settlementId);
    
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
    const settlement = await settlementService.getSettlementById(settlementId);
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
    
    // Update the settlement
    const updatedSettlement = await settlementService.updateSettlementStatus(
      settlementId,
      status,
      status === 'completed' ? new Date() : null
    );
    
    res.json({
      success: true,
      data: updatedSettlement
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all settlements for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getUserSettlements(req, res, next) {
  try {
    const userId = req.user.id;
    const { type, status, limit = 20, offset = 0 } = req.query;
    
    // Determine filter type
    let filter = {};
    if (type === 'paid') {
      filter.payerId = userId;
    } else if (type === 'received') {
      filter.receiverId = userId;
    } else {
      // Both paid and received
      filter = {
        $or: [{ payerId: userId }, { receiverId: userId }]
      };
    }
    
    // Add status filter if provided
    if (status) {
      filter.status = status;
    }
    
    const settlements = await settlementService.getSettlementsByFilter(
      filter,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({
      success: true,
      data: settlements
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Compare different settlement algorithms
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function compareAlgorithms(req, res, next) {
  try {
    const { groupId } = req.params;
    
    // Get debt graph for the group
    const debtGraph = await settlementService.getGroupDebtGraph(groupId);
    
    // Get exchange rates if there are multiple currencies
    const currencies = [...new Set(debtGraph.debts.map(debt => debt.currency))];
    let exchangeRates = {};
    if (currencies.length > 1) {
      exchangeRates = await settlementService.getExchangeRates(currencies);
    }
    
    // Get friendships for friendship-optimized algorithm
    const friendships = await settlementService.getFriendshipStrengths(groupId);
    
    // Generate settlements with different algorithms
    const algorithms = {
      minCashFlow: optimizationService.calculateMinCashFlowSettlements(debtGraph, exchangeRates),
      greedy: optimizationService.calculateGreedySettlements(debtGraph, exchangeRates),
      friendOptimized: optimizationService.calculateFriendPreferenceSettlements(
        debtGraph, 
        exchangeRates, 
        friendships
      )
    };
    
    // Compare results
    const comparison = {
      transactionCounts: {
        minCashFlow: algorithms.minCashFlow.length,
        greedy: algorithms.greedy.length,
        friendOptimized: algorithms.friendOptimized.length
      },
      averageTransactionAmount: {
        minCashFlow: algorithms.minCashFlow.length > 0 
          ? algorithms.minCashFlow.reduce((sum, s) => sum + s.amount, 0) / algorithms.minCashFlow.length 
          : 0,
        greedy: algorithms.greedy.length > 0 
          ? algorithms.greedy.reduce((sum, s) => sum + s.amount, 0) / algorithms.greedy.length 
          : 0,
        friendOptimized: algorithms.friendOptimized.length > 0 
          ? algorithms.friendOptimized.reduce((sum, s) => sum + s.amount, 0) / algorithms.friendOptimized.length 
          : 0
      },
      friendshipUtilization: {
        minCashFlow: calculateFriendshipUtilization(algorithms.minCashFlow, friendships),
        greedy: calculateFriendshipUtilization(algorithms.greedy, friendships),
        friendOptimized: calculateFriendshipUtilization(algorithms.friendOptimized, friendships)
      }
    };
    
    // Generate visualizations
    const visualizations = {
      minCashFlow: visualizationService.generateSettlementVisualization(
        debtGraph,
        algorithms.minCashFlow
      ),
      greedy: visualizationService.generateSettlementVisualization(
        debtGraph,
        algorithms.greedy
      ),
      friendOptimized: visualizationService.generateSettlementVisualization(
        debtGraph,
        algorithms.friendOptimized
      )
    };
    
    res.json({
      success: true,
      data: {
        algorithms,
        comparison,
        visualizations
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Calculate friendship utilization for an algorithm
 * @param {Array} settlements - Settlement array
 * @param {Object} friendships - Friendship strengths
 * @returns {number} Friendship utilization score
 */
function calculateFriendshipUtilization(settlements, friendships) {
  if (!settlements.length || !friendships) return 0;
  
  let totalFriendshipScore = 0;
  let maxPossibleScore = 0;
  
  for (const settlement of settlements) {
    const key = `${settlement.from}_${settlement.to}`;
    const reverseKey = `${settlement.to}_${settlement.from}`;
    
    const friendshipScore = friendships[key] || friendships[reverseKey] || 0;
    totalFriendshipScore += friendshipScore;
    maxPossibleScore += 1; // Assuming max friendship score is 1
  }
  
  return maxPossibleScore > 0 ? totalFriendshipScore / maxPossibleScore : 0;
}

/**
 * Get detailed calculation breakdown for settlements
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getSettlementCalculationDetails(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { algorithm } = req.query;
    
    // Get user preferences to determine algorithm and currency preferences
    const userPreferences = await userPreferenceService.getUserPreferences(userId);
    
    // Use query params if provided, otherwise use user preferences
    const selectedAlgorithm = algorithm || userPreferences.settlementAlgorithm || 'minCashFlow';
    
    // Get debt graph for the group
    const debtGraph = await settlementService.getGroupDebtGraph(groupId);
    
    // Determine base currency - use user's preferred currency if available
    const preferredCurrency = userPreferences.defaultCurrency;
    
    // Get all currencies used in debts
    const currencies = [...new Set(debtGraph.debts.map(debt => debt.currency))];
    
    // Add preferred currency to the list if not already included
    if (preferredCurrency && !currencies.includes(preferredCurrency)) {
      currencies.push(preferredCurrency);
    }
    
    // Get exchange rates if there are multiple currencies
    let exchangeRates = {};
    if (currencies.length > 1) {
      exchangeRates = await settlementService.getExchangeRates(currencies);
    }
    
    // Get friendships if using friend preference algorithm
    let friendships = null;
    if (selectedAlgorithm === 'friendPreference') {
      friendships = await settlementService.getFriendshipStrengths(groupId);
    }
    
    // Generate settlement suggestions based on algorithm
    let settlements;
    switch (selectedAlgorithm) {
      case 'greedy':
        settlements = await optimizationService.calculateGreedySettlements(debtGraph, exchangeRates);
        break;
      case 'friendPreference':
        settlements = await optimizationService.calculateFriendPreferenceSettlements(
          debtGraph, 
          exchangeRates, 
          friendships
        );
        break;
      case 'minCashFlow':
      default:
        settlements = await optimizationService.calculateMinCashFlowSettlements(debtGraph, exchangeRates);
        break;
    }
    
    // Generate detailed breakdown
    const breakdown = visualizationService.generateSettlementBreakdown(debtGraph, settlements);
    
    // Generate natural language explanation
    const explanation = visualizationService.generateSettlementExplanation(
      debtGraph,
      settlements,
      selectedAlgorithm
    );
    
    // Return comprehensive calculation details
    res.json({
      success: true,
      data: {
        algorithm: selectedAlgorithm,
        breakdown,
        explanation,
        settlements,
        debtGraph,
        stats: breakdown.stats
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettlementSuggestions,
  createSettlement,
  getGroupSettlements,
  getSettlementById,
  updateSettlementStatus,
  getUserSettlements,
  compareAlgorithms,
  getSettlementCalculationDetails
}; 