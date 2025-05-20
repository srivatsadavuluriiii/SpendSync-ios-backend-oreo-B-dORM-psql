const expenseRepository = require('../repositories/expense.repository');
const { BadRequestError, NotFoundError } = require('@shared/errors');

/**
 * Create a new expense
 * @param {Object} expenseData Expense data
 * @returns {Promise<Object>} Created expense
 */
async function createExpense(expenseData) {
  if (!expenseData || !expenseData.amount || !expenseData.paidBy) {
    throw new BadRequestError('Invalid expense data');
  }

  return expenseRepository.create(expenseData);
}

/**
 * Get expense by ID
 * @param {string} expenseId Expense ID
 * @returns {Promise<Object>} Expense object
 */
async function getExpense(expenseId) {
  if (!expenseId) {
    throw new BadRequestError('Expense ID is required');
  }

  const expense = await expenseRepository.findById(expenseId);
  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  return expense;
}

/**
 * Update expense
 * @param {string} expenseId Expense ID
 * @param {Object} updateData Update data
 * @returns {Promise<Object>} Updated expense
 */
async function updateExpense(expenseId, updateData) {
  if (!expenseId || !updateData) {
    throw new BadRequestError('Expense ID and update data are required');
  }

  const expense = await expenseRepository.findById(expenseId);
  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  return expenseRepository.update(expenseId, updateData);
}

/**
 * Delete expense
 * @param {string} expenseId Expense ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteExpense(expenseId) {
  if (!expenseId) {
    throw new BadRequestError('Expense ID is required');
  }

  const expense = await expenseRepository.findById(expenseId);
  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  return expenseRepository.delete(expenseId);
}

/**
 * Get expenses by group
 * @param {string} groupId Group ID
 * @returns {Promise<Array>} List of expenses
 */
async function getExpensesByGroup(groupId) {
  if (!groupId) {
    throw new BadRequestError('Group ID is required');
  }

  return expenseRepository.findByGroupId(groupId);
}

module.exports = {
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpensesByGroup
}; 