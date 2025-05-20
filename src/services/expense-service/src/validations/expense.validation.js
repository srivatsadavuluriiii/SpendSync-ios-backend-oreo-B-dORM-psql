const Joi = require('joi');
const {
  objectIdSchema,
  expenseCommonFields,
  splitCommonFields,
  paginationSchema
} = require('../../../../shared/validations/common.validation');

/**
 * Validation schema for creating an expense
 */
const createExpenseSchema = Joi.object({
  ...expenseCommonFields,
  groupId: objectIdSchema.required(),
  paidBy: objectIdSchema.required(),
  splits: Joi.array().items(Joi.object(splitCommonFields)).min(1).required()
    .custom((splits, helpers) => {
      // Validate splits based on type
      const splitType = splits[0].splitType;
      
      // All splits must have the same type
      if (!splits.every(split => split.splitType === splitType)) {
        return helpers.error('All splits must have the same type');
      }
      
      // For percentage splits, total must be 100%
      if (splitType === 'percentage') {
        const total = splits.reduce((sum, split) => sum + split.percentage, 0);
        if (Math.abs(total - 100) > 0.01) {
          return helpers.error('Percentage splits must total 100%');
        }
      }
      
      // For fixed splits, total must match expense amount
      if (splitType === 'fixed') {
        const total = splits.reduce((sum, split) => sum + split.amount, 0);
        const expenseAmount = helpers.state.ancestors[0].amount;
        if (Math.abs(total - expenseAmount) > 0.01) {
          return helpers.error('Fixed splits must total to expense amount');
        }
      }
      
      return splits;
    })
});

/**
 * Validation schema for updating an expense
 */
const updateExpenseSchema = Joi.object({
  ...expenseCommonFields,
  groupId: objectIdSchema,
  paidBy: objectIdSchema,
  splits: Joi.array().items(Joi.object(splitCommonFields)).min(1)
    .custom((splits, helpers) => {
      if (!splits) return splits;
      
      // Reuse the same split validation logic
      const validation = createExpenseSchema.validate({ 
        ...helpers.state.ancestors[0],
        splits 
      });
      
      if (validation.error) {
        return helpers.error(validation.error.details[0].message);
      }
      return splits;
    })
}).min(1); // At least one field must be provided for update

/**
 * Validation schema for listing expenses
 */
const listExpensesSchema = Joi.object({
  ...paginationSchema,
  groupId: objectIdSchema,
  userId: objectIdSchema,
  category: Joi.string(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  minAmount: Joi.number().positive(),
  maxAmount: Joi.number().positive().greater(Joi.ref('minAmount')),
  splitType: Joi.string().valid('equal', 'percentage', 'fixed', 'share'),
  status: Joi.string().valid('pending', 'settled', 'all').default('all')
});

/**
 * Validation schema for getting expense by ID
 */
const getExpenseSchema = Joi.object({
  expenseId: objectIdSchema.required()
});

/**
 * Validation schema for deleting expense
 */
const deleteExpenseSchema = Joi.object({
  expenseId: objectIdSchema.required()
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  getExpenseSchema,
  deleteExpenseSchema
}; 