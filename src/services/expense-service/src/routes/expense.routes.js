const express = require('express');
const validate = require('../../../../shared/middleware/validate.middleware');
const {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  getExpenseSchema,
  deleteExpenseSchema
} = require('../validations/expense.validation');
const expenseController = require('../controllers/expense.controller');
const auth = require('../../../../shared/middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/expenses
 * @desc    Create a new expense
 * @access  Private
 */
router.post(
  '/',
  auth(),
  validate(createExpenseSchema),
  expenseController.createExpense
);

/**
 * @route   GET /api/expenses
 * @desc    Get all expenses with filters
 * @access  Private
 */
router.get(
  '/',
  auth(),
  validate(listExpensesSchema),
  expenseController.getExpenses
);

/**
 * @route   GET /api/expenses/:expenseId
 * @desc    Get expense by ID
 * @access  Private
 */
router.get(
  '/:expenseId',
  auth(),
  validate(getExpenseSchema),
  expenseController.getExpenseById
);

/**
 * @route   PUT /api/expenses/:expenseId
 * @desc    Update expense
 * @access  Private
 */
router.put(
  '/:expenseId',
  auth(),
  validate(updateExpenseSchema),
  expenseController.updateExpense
);

/**
 * @route   DELETE /api/expenses/:expenseId
 * @desc    Delete expense
 * @access  Private
 */
router.delete(
  '/:expenseId',
  auth(),
  validate(deleteExpenseSchema),
  expenseController.deleteExpense
);

module.exports = router; 