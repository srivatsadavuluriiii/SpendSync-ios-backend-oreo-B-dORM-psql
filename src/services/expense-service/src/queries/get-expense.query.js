const { NotFoundError } = require('../../../../shared/errors');
const ExpenseReadModel = require('../models/expense.read-model');
const cache = require('../../../../shared/cache');

class GetExpenseQuery {
  constructor(expenseId, userId) {
    this.expenseId = expenseId;
    this.userId = userId;
  }

  async execute() {
    const cacheKey = `expense:${this.expenseId}`;

    try {
      // Try to get from cache first
      const cachedExpense = await cache.get(cacheKey);
      if (cachedExpense) {
        return JSON.parse(cachedExpense);
      }

      // If not in cache, get from read model
      const expense = await ExpenseReadModel.findOne({
        where: {
          id: this.expenseId,
          $or: [
            { paidBy: this.userId },
            { 'splits.userId': this.userId }
          ]
        },
        include: ['splits', 'group']
      });

      if (!expense) {
        throw new NotFoundError('Expense not found');
      }

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(expense), 300); // Cache for 5 minutes

      return expense;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error('Failed to retrieve expense');
    }
  }

  /**
   * List expenses with filters
   * @param {Object} filters Query filters
   * @param {Object} pagination Pagination options
   */
  static async list(filters, pagination) {
    const cacheKey = `expenses:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;

    try {
      // Try cache first
      const cachedExpenses = await cache.get(cacheKey);
      if (cachedExpenses) {
        return JSON.parse(cachedExpenses);
      }

      // Build query
      const query = {
        where: {},
        include: ['splits', 'group'],
        order: [['date', 'DESC']],
        ...pagination
      };

      // Apply filters
      if (filters.groupId) query.where.groupId = filters.groupId;
      if (filters.category) query.where.category = filters.category;
      if (filters.startDate) query.where.date = { $gte: filters.startDate };
      if (filters.endDate) query.where.date = { ...query.where.date, $lte: filters.endDate };
      if (filters.minAmount) query.where.amount = { $gte: filters.minAmount };
      if (filters.maxAmount) query.where.amount = { ...query.where.amount, $lte: filters.maxAmount };

      const expenses = await ExpenseReadModel.findAndCountAll(query);

      // Cache the results
      await cache.set(cacheKey, JSON.stringify(expenses), 60); // Cache for 1 minute

      return expenses;
    } catch (error) {
      throw new Error('Failed to list expenses');
    }
  }
}

module.exports = GetExpenseQuery; 