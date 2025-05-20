/**
 * Settlement Controller
 * 
 * Handles HTTP requests related to settlements and debt optimization,
 * including suggestions, creation, and tracking of settlements.
 */

import { Request, Response, NextFunction } from 'express';
import { BadRequestError, NotFoundError } from '../../../../shared/errors/index.js';
import { SettlementService } from '../services/settlement.service.js';
import * as optimizationService from '../services/optimization.service.js';
import * as visualizationService from '../services/visualization.service.js';
import * as userPreferenceService from '../services/user-preference.service.js';
import { logger } from '../utils/logger.js';

// Create a new instance of the settlement service
const settlementService = new SettlementService();

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

interface SettlementData {
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  groupId: string;
  notes?: string;
  createdBy: string;
  status: 'pending' | 'completed' | 'cancelled';
}

interface DebtGraph {
  debts: Array<{
    from: string;
    to: string;
    amount: number;
    currency: string;
  }>;
  users: Array<{
    id: string;
    name: string;
  }>;
}

interface Settlement {
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
}

interface UserPreferences {
  settlementAlgorithm?: string;
  defaultCurrency?: string;
}

/**
 * Get settlement suggestions for a group
 */
export async function getSettlementSuggestions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    // Get user preferences to determine algorithm and currency preferences
    const userPreferences = await userPreferenceService.getUserPreferences(userId) as UserPreferences;
    
    // Use query params if provided, otherwise use user preferences
    const algorithm = req.query.algorithm as string || userPreferences.settlementAlgorithm || 'minCashFlow';
    const includeFriendships = req.query.includeFriendships === 'true' || algorithm === 'friendPreference';
    
    // Get debt graph for the group
    const debtGraph = await settlementService.getGroupDebtGraph(groupId);
    
    // Determine base currency - use user's preferred currency if available
    const preferredCurrency = userPreferences.defaultCurrency;
    
    // Get all currencies used in debts
    const currencies = [...new Set(debtGraph.debts.map((debt: { currency: string }) => debt.currency))];
    
    // Add preferred currency to the list if not already included
    if (preferredCurrency && !currencies.includes(preferredCurrency)) {
      currencies.push(preferredCurrency);
    }
    
    // Get exchange rates if there are multiple currencies
    let exchangeRates: Record<string, number> = {};
    if (currencies.length > 1) {
      exchangeRates = await settlementService.getExchangeRates(currencies);
    }
    
    // Get friendships if requested or if using friend preference algorithm
    let friendships: Record<string, number> | null = null;
    if (includeFriendships || algorithm === 'friendPreference') {
      friendships = await settlementService.getFriendshipStrengths(groupId);
    }
    
    // Generate settlement suggestions based on algorithm
    let settlements: Settlement[];
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
    let explanation: {
      summary: string;
      algorithmExplanation: string;
      stepByStepExplanation: string[];
      transactionSummary: string[];
    } | null = null;
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
 */
export async function createSettlement(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { payerId, receiverId, amount, currency, groupId, notes } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!payerId || !receiverId || !amount || !groupId) {
      throw new BadRequestError('Missing required fields');
    }
    
    // Get user preferences for default currency
    const userPreferences = await userPreferenceService.getUserPreferences(userId) as UserPreferences;
    
    // Create settlement data
    const settlementData: SettlementData = {
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
 */
export async function getGroupSettlements(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { groupId } = req.params;
    const { 
      status, 
      limit = '20', 
      offset = '0', 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    const settlements = await settlementService.getSettlementsByGroup(
      groupId,
      status as string,
      parseInt(limit as string),
      parseInt(offset as string),
      sortBy as string,
      sortOrder as string
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
 * Get a settlement by ID
 */
export async function getSettlementById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const settlement = await settlementService.getSettlementById(id);
    
    if (!settlement) {
      throw new NotFoundError('Settlement not found');
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
 * Update settlement status
 */
export async function updateSettlementStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    if (!status) {
      throw new BadRequestError('Status is required');
    }
    
    const settlement = await settlementService.updateSettlementStatus(id, status, { userId });
    
    res.json({
      success: true,
      data: settlement
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get settlements for a user
 */
export async function getUserSettlements(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.id;
    const { 
      status, 
      limit = '20', 
      offset = '0', 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    const settlements = await settlementService.getSettlementsByFilter(
      { userId, status: status as string },
      parseInt(limit as string),
      parseInt(offset as string)
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
 */
export async function compareAlgorithms(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { groupId } = req.params;
    const debtGraph = await settlementService.getGroupDebtGraph(groupId);
    const friendships = await settlementService.getFriendshipStrengths(groupId);
    
    // Get exchange rates if there are multiple currencies
    const currencies = [...new Set(debtGraph.debts.map((debt: { currency: string }) => debt.currency))];
    const exchangeRates = currencies.length > 1 
      ? await settlementService.getExchangeRates(currencies)
      : {};
    
    // Calculate settlements using different algorithms
    const [minCashFlow, greedy, friendPreference] = await Promise.all([
      optimizationService.calculateMinCashFlowSettlements(debtGraph, exchangeRates),
      optimizationService.calculateGreedySettlements(debtGraph, exchangeRates),
      optimizationService.calculateFriendPreferenceSettlements(debtGraph, exchangeRates, friendships)
    ]);
    
    // Calculate metrics for each algorithm
    const results = {
      minCashFlow: {
        settlements: minCashFlow,
        metrics: {
          totalTransactions: minCashFlow.length,
          totalAmount: calculateTotalAmount(minCashFlow),
          friendshipUtilization: calculateFriendshipUtilization(minCashFlow, friendships)
        }
      },
      greedy: {
        settlements: greedy,
        metrics: {
          totalTransactions: greedy.length,
          totalAmount: calculateTotalAmount(greedy),
          friendshipUtilization: calculateFriendshipUtilization(greedy, friendships)
        }
      },
      friendPreference: {
        settlements: friendPreference,
        metrics: {
          totalTransactions: friendPreference.length,
          totalAmount: calculateTotalAmount(friendPreference),
          friendshipUtilization: calculateFriendshipUtilization(friendPreference, friendships)
        }
      }
    };
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
}

function calculateTotalAmount(settlements: Settlement[]): number {
  return settlements.reduce((total, settlement) => total + settlement.amount, 0);
}

function calculateFriendshipUtilization(
  settlements: Settlement[],
  friendships: Record<string, number> | null
): number {
  if (!friendships) return 0;
  
  return settlements.reduce((total, settlement) => {
    const friendshipKey = `${settlement.payerId}-${settlement.receiverId}`;
    const reverseKey = `${settlement.receiverId}-${settlement.payerId}`;
    const friendshipStrength = friendships[friendshipKey] || friendships[reverseKey] || 0;
    return total + friendshipStrength;
  }, 0) / settlements.length;
}

/**
 * Get detailed calculation information for a settlement
 */
export async function getSettlementCalculationDetails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const settlement = await settlementService.getSettlementById(id);
    
    if (!settlement) {
      throw new NotFoundError('Settlement not found');
    }
    
    const details = await settlementService.getSettlementCalculationDetails(id);
    
    res.json({
      success: true,
      data: {
        settlement,
        calculationDetails: details
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get debt graph for a group
 */
export async function getDebtGraph(req: Request, res: Response, next: NextFunction) {
  const { groupId } = req.params;
  const { currencies } = req.query;

  try {
    // Get debt graph
    const debtGraph = await settlementService.getGroupDebtGraph(groupId);

    // Get exchange rates if multiple currencies
    let exchangeRates = null;
    if (currencies) {
      exchangeRates = await settlementService.getExchangeRates(currencies as string[]);
    }

    // Get friendship strengths for optimization
    let friendships = null;
    try {
      friendships = await settlementService.getFriendshipStrengths(groupId);
    } catch (error) {
      logger.warn('Failed to get friendship strengths:', error);
    }

    res.json({
      success: true,
      data: {
        debtGraph,
        exchangeRates,
        friendships: friendships || {}
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get optimization suggestions
 */
export async function getOptimizationSuggestions(req: Request, res: Response, next: NextFunction) {
  const { groupId } = req.params;
  const { currencies } = req.query;

  try {
    // Get current debt graph
    const debtGraph = await settlementService.getGroupDebtGraph(groupId);
    const friendships = await settlementService.getFriendshipStrengths(groupId);

    // Get exchange rates if multiple currencies
    const exchangeRates = currencies 
      ? await settlementService.getExchangeRates(currencies as string[])
      : null;

    // Calculate suggestions
    const suggestions = calculateOptimizedSettlements(debtGraph, exchangeRates, friendships);

    res.json({
      success: true,
      data: {
        suggestions,
        debtGraph,
        exchangeRates,
        friendships
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get settlement details
 */
export async function getSettlementDetails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const settlement = await settlementService.getSettlementById(id);
    
    if (!settlement) {
      throw new NotFoundError(`Settlement not found: ${id}`);
    }
    
    // Get additional details like payment status, history, etc.
    const details = await settlementService.getSettlementDetails(id);
    
    res.json({
      success: true,
      data: {
        settlement,
        details
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Calculate optimized settlements
 */
function calculateOptimizedSettlements(
  debtGraph: any,
  exchangeRates: any = null,
  friendships: any = null
) {
  // This would implement the actual optimization algorithm
  // For now, return a placeholder
  return {
    optimizedSettlements: [],
    metrics: {
      totalTransactions: 0,
      averageAmount: 0,
      currencyDistribution: {}
    }
  };
} 