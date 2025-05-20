/**
 * Expense Controller
 * 
 * Handles HTTP requests related to expenses, including creation,
 * retrieval, updates, and deletion.
 */

const { BadRequestError, NotFoundError } = require('../../../../shared/errors');
const expenseService = require('../services/expense.service');
const splitService = require('../services/split.service');
const balanceService = require('../services/balance.service');

/**
 * Create a new expense
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function createExpense(req, res, next) {
  try {
    const { groupId, description, amount, currency, date, category, paidBy, splits } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!groupId || !amount || !paidBy || !splits) {
      throw new BadRequestError('Missing required fields');
    }

    // Create expense
    const expenseData = {
      groupId,
      description,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      date: date || new Date(),
      category,
      paidBy,
      createdBy
    };

    // Calculate split amounts
    const processedSplits = splitService.calculateSplitAmounts(
      { amount: expenseData.amount },
      splits
    );

    // Create the expense with splits
    const expense = await expenseService.createExpense(expenseData, processedSplits);

    // Generate split visualization
    const visualization = splitService.generateSplitVisualization(
      { amount: expenseData.amount, currency: expenseData.currency },
      processedSplits
    );

    res.status(201).json({
      success: true,
      data: {
        expense,
        visualization
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all expenses for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getGroupExpenses(req, res, next) {
  try {
    const { groupId } = req.params;
    const { limit = 20, offset = 0, sortBy = 'date', sortOrder = 'desc' } = req.query;

    const expenses = await expenseService.getExpensesByGroup(
      groupId,
      parseInt(limit),
      parseInt(offset),
      sortBy,
      sortOrder
    );

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single expense by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getExpenseById(req, res, next) {
  try {
    const { expenseId } = req.params;
    const expense = await expenseService.getExpenseById(expenseId);

    if (!expense) {
      throw new NotFoundError(`Expense with ID ${expenseId} not found`);
    }

    // Generate visualization if requested
    let visualization = null;
    if (req.query.includeVisualization === 'true') {
      visualization = splitService.generateSplitVisualization(
        { amount: expense.amount, currency: expense.currency },
        expense.splits
      );
    }

    res.json({
      success: true,
      data: {
        expense,
        visualization
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an expense
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updateExpense(req, res, next) {
  try {
    const { expenseId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    // Get the existing expense
    const existingExpense = await expenseService.getExpenseById(expenseId);
    if (!existingExpense) {
      throw new NotFoundError(`Expense with ID ${expenseId} not found`);
    }

    // Check if user has permission to update (creator or payer)
    if (existingExpense.createdBy !== userId && existingExpense.paidBy !== userId) {
      throw new BadRequestError('You do not have permission to update this expense');
    }

    // Process splits if provided
    let processedSplits = null;
    if (updateData.splits) {
      const expenseAmount = updateData.amount || existingExpense.amount;
      processedSplits = splitService.calculateSplitAmounts(
        { amount: parseFloat(expenseAmount) },
        updateData.splits
      );
    }

    // Update the expense
    const updatedExpense = await expenseService.updateExpense(
      expenseId,
      updateData,
      processedSplits
    );

    // Generate visualization
    const visualization = splitService.generateSplitVisualization(
      { 
        amount: updatedExpense.amount, 
        currency: updatedExpense.currency 
      },
      updatedExpense.splits
    );

    res.json({
      success: true,
      data: {
        expense: updatedExpense,
        visualization
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete (soft-delete) an expense
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function deleteExpense(req, res, next) {
  try {
    const { expenseId } = req.params;
    const userId = req.user.id;

    // Get the existing expense
    const existingExpense = await expenseService.getExpenseById(expenseId);
    if (!existingExpense) {
      throw new NotFoundError(`Expense with ID ${expenseId} not found`);
    }

    // Check if user has permission to delete (creator or payer)
    if (existingExpense.createdBy !== userId && existingExpense.paidBy !== userId) {
      throw new BadRequestError('You do not have permission to delete this expense');
    }

    // Soft delete the expense
    await expenseService.deleteExpense(expenseId);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get balances for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getGroupBalances(req, res, next) {
  try {
    const { groupId } = req.params;
    
    // Get expenses, settlements, and users for the group
    const expenses = await expenseService.getExpensesByGroup(groupId);
    const settlements = await expenseService.getSettlementsByGroup(groupId);
    const users = await expenseService.getGroupMembers(groupId);
    
    // Calculate balances
    const balances = await balanceService.calculateGroupBalances(
      groupId,
      expenses,
      settlements,
      users
    );
    
    // Generate debt graph if requested
    let debtGraph = null;
    if (req.query.includeDebtGraph === 'true') {
      debtGraph = balanceService.calculateDebtGraph(balances);
    }
    
    res.json({
      success: true,
      data: {
        balances,
        debtGraph
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a user's balance in a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getUserGroupBalance(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    // Get relevant expenses and settlements
    const expenses = await expenseService.getUserExpensesInGroup(userId, groupId);
    const settlements = await expenseService.getUserSettlementsInGroup(userId, groupId);
    
    // Calculate user balance
    const balance = await balanceService.calculateUserBalance(
      userId,
      groupId,
      expenses,
      settlements
    );
    
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a user's summary balance across all groups
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getUserBalanceSummary(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Get user's groups
    const userGroups = await expenseService.getUserGroups(userId);
    
    // Get balance for each group
    const groupBalances = [];
    for (const group of userGroups) {
      const expenses = await expenseService.getUserExpensesInGroup(userId, group.id);
      const settlements = await expenseService.getUserSettlementsInGroup(userId, group.id);
      
      const balance = await balanceService.calculateUserBalance(
        userId,
        group.id,
        expenses,
        settlements
      );
      
      // Add group name
      balance.groupName = group.name;
      groupBalances.push(balance);
    }
    
    // Summarize balances
    const summary = balanceService.summarizeUserBalances(userId, groupBalances);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createExpense,
  getGroupExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getGroupBalances,
  getUserGroupBalance,
  getUserBalanceSummary
}; 