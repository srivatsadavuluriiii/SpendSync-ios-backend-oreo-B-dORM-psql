/**
 * Expense Repository
 * 
 * Handles data access for expenses
 */
const BaseRepository = require('../../../../shared/database/repositories/base.repository');
const ExpenseModel = require('../models/expense.model');
const { DatabaseError } = require('../../../../shared/errors');
const dbConnection = require('../../../../shared/database/connection');

class ExpenseRepository extends BaseRepository {
  constructor() {
    super('expenses');
  }

  /**
   * Create a new expense with splits
   * @param {Object} expenseData - Expense data
   * @param {Array} splitsData - Expense splits data
   * @returns {Promise<Object>} Created expense with splits
   */
  async createExpense(expenseData, splitsData) {
    try {
      const expense = ExpenseModel.create(expenseData);
      
      // Create splits with reference to the expense
      const splits = splitsData.map(split => 
        ExpenseModel.createSplit({
          ...split,
          expenseId: expense._id
        })
      );
      
      // Use a transaction to ensure both operations succeed or fail
      return await dbConnection.withTransaction(async (session) => {
        // Insert expense
        const expenseResult = await this.getCollection().insertOne(expense, { session });
        if (!expenseResult.acknowledged) {
          throw new DatabaseError('Failed to create expense');
        }
        
        // Insert splits if any
        if (splits.length > 0) {
          const splitsCollection = dbConnection.getCollection('expense_splits');
          const splitsResult = await splitsCollection.insertMany(splits, { session });
          
          if (!splitsResult.acknowledged) {
            throw new DatabaseError('Failed to create expense splits');
          }
        }
        
        return {
          ...expense,
          splits
        };
      });
    } catch (error) {
      throw new DatabaseError('Failed to create expense', error);
    }
  }

  /**
   * Get an expense by ID with its splits
   * @param {string} expenseId - Expense ID
   * @returns {Promise<Object|null>} Expense with splits or null
   */
  async getExpenseWithSplits(expenseId) {
    try {
      const expense = await this.findById(expenseId);
      
      if (!expense) {
        return null;
      }
      
      // Get splits for this expense
      const splitsCollection = dbConnection.getCollection('expense_splits');
      const splits = await splitsCollection
        .find({ expenseId: expense._id })
        .toArray();
      
      return {
        ...expense,
        splits
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get expense with ID ${expenseId}`, error);
    }
  }

  /**
   * Get expenses for a group
   * @param {string} groupId - Group ID
   * @param {number} limit - Maximum number of results
   * @param {number} offset - Offset for pagination
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - Sort direction ('asc' or 'desc')
   * @returns {Promise<Array>} Expenses for the group
   */
  async getExpensesByGroup(groupId, limit = 20, offset = 0, sortBy = 'date', sortOrder = 'desc') {
    try {
      const query = { 
        groupId,
        isDeleted: { $ne: true }
      };
      
      const sort = {
        [sortBy]: sortOrder === 'desc' ? -1 : 1
      };
      
      const expenses = await this.find(query, { sort, limit, skip: offset });
      
      // Get all expense IDs
      const expenseIds = expenses.map(expense => expense._id);
      
      if (expenseIds.length === 0) {
        return [];
      }
      
      // Get all splits for these expenses
      const splitsCollection = dbConnection.getCollection('expense_splits');
      const splits = await splitsCollection
        .find({ expenseId: { $in: expenseIds } })
        .toArray();
      
      // Group splits by expense ID
      const splitsByExpenseId = splits.reduce((acc, split) => {
        if (!acc[split.expenseId]) {
          acc[split.expenseId] = [];
        }
        acc[split.expenseId].push(split);
        return acc;
      }, {});
      
      // Attach splits to each expense
      return expenses.map(expense => ({
        ...expense,
        splits: splitsByExpenseId[expense._id] || []
      }));
    } catch (error) {
      throw new DatabaseError(`Failed to get expenses for group ${groupId}`, error);
    }
  }

  /**
   * Update an expense and its splits
   * @param {string} expenseId - Expense ID
   * @param {Object} expenseData - Updated expense data
   * @param {Array} splitsData - Updated splits data
   * @returns {Promise<Object|null>} Updated expense or null
   */
  async updateExpense(expenseId, expenseData, splitsData) {
    try {
      const expense = await this.findById(expenseId);
      
      if (!expense) {
        return null;
      }
      
      // Prepare update data
      const updateData = {
        ...expenseData,
        updatedAt: ExpenseModel.timestamp()
      };
      
      return await dbConnection.withTransaction(async (session) => {
        // Update expense
        const updatedExpense = await this.update(expenseId, updateData);
        
        // Handle splits update if provided
        if (splitsData) {
          const splitsCollection = dbConnection.getCollection('expense_splits');
          
          // Delete existing splits
          await splitsCollection.deleteMany(
            { expenseId: expense._id },
            { session }
          );
          
          // Create new splits
          const splits = splitsData.map(split => 
            ExpenseModel.createSplit({
              ...split,
              expenseId: expense._id
            })
          );
          
          // Insert new splits
          if (splits.length > 0) {
            await splitsCollection.insertMany(splits, { session });
          }
          
          return {
            ...updatedExpense,
            splits
          };
        }
        
        // If no splits data, get existing splits
        const existingSplits = await dbConnection
          .getCollection('expense_splits')
          .find({ expenseId: expense._id })
          .toArray();
        
        return {
          ...updatedExpense,
          splits: existingSplits
        };
      });
    } catch (error) {
      throw new DatabaseError(`Failed to update expense ${expenseId}`, error);
    }
  }

  /**
   * Soft delete an expense
   * @param {string} expenseId - Expense ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteExpense(expenseId) {
    try {
      const expense = await this.findById(expenseId);
      
      if (!expense) {
        return false;
      }
      
      // Soft delete by updating isDeleted flag
      const result = await this.update(expenseId, {
        isDeleted: true,
        updatedAt: ExpenseModel.timestamp()
      });
      
      return !!result;
    } catch (error) {
      throw new DatabaseError(`Failed to delete expense ${expenseId}`, error);
    }
  }
}

// Create a singleton instance
const expenseRepository = new ExpenseRepository();
module.exports = expenseRepository; 