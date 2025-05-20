/**
 * Expense Validation Schemas
 * 
 * Defines Joi validation schemas for expense-related endpoints
 */

const Joi = require('joi');
const { id, amount, currency, date, paginationSchema } = require('./common.schemas');

// Split type enum
const splitTypes = ['equal', 'percentage', 'fixed', 'shares'];

// Participant schema
const participantSchema = Joi.object({
  userId: id,
  share: Joi.when('splitType', {
    is: 'percentage',
    then: Joi.number().min(0).max(100).required(),
    otherwise: Joi.number().min(0)
  }),
  amount: Joi.when('splitType', {
    is: 'fixed',
    then: amount.required(),
    otherwise: amount
  }),
  shares: Joi.when('splitType', {
    is: 'shares',
    then: Joi.number().integer().min(1).required(),
    otherwise: Joi.number().integer().min(1)
  })
});

// Create expense schema
const createExpenseSchema = Joi.object({
  body: Joi.object({
    description: Joi.string().min(3).max(200).required(),
    amount: amount.required(),
    currency: currency.required(),
    date: date.default(Date.now),
    category: Joi.string().required(),
    splitType: Joi.string().valid(...splitTypes).required(),
    groupId: id,
    paidBy: id.required(),
    participants: Joi.array().items(participantSchema).min(1).required(),
    notes: Joi.string().max(1000),
    receipt: Joi.string().uri(),
    tags: Joi.array().items(Joi.string()),
    location: Joi.object({
      name: Joi.string(),
      coordinates: Joi.array().items(Joi.number()).length(2)
    }),
    isRecurring: Joi.boolean().default(false),
    recurringDetails: Joi.when('isRecurring', {
      is: true,
      then: Joi.object({
        frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
        startDate: date.required(),
        endDate: date,
        dayOfWeek: Joi.number().min(0).max(6).when('frequency', {
          is: 'weekly',
          then: Joi.required()
        }),
        dayOfMonth: Joi.number().min(1).max(31).when('frequency', {
          is: 'monthly',
          then: Joi.required()
        })
      }).required(),
      otherwise: Joi.forbidden()
    })
  }).required()
});

// Update expense schema
const updateExpenseSchema = Joi.object({
  params: Joi.object({
    expenseId: id
  }),
  body: Joi.object({
    description: Joi.string().min(3).max(200),
    amount: amount,
    currency: currency,
    date: date,
    category: Joi.string(),
    splitType: Joi.string().valid(...splitTypes),
    participants: Joi.array().items(participantSchema).min(1),
    notes: Joi.string().max(1000),
    receipt: Joi.string().uri(),
    tags: Joi.array().items(Joi.string()),
    location: Joi.object({
      name: Joi.string(),
      coordinates: Joi.array().items(Joi.number()).length(2)
    })
  }).min(1).required()
});

// Get expenses schema
const getExpensesSchema = Joi.object({
  query: paginationSchema.keys({
    groupId: id,
    userId: id,
    category: Joi.string(),
    startDate: date,
    endDate: date,
    minAmount: amount,
    maxAmount: amount,
    currency: currency,
    splitType: Joi.string().valid(...splitTypes),
    isSettled: Joi.boolean(),
    tags: Joi.array().items(Joi.string()),
    search: Joi.string().min(2)
  })
});

// Delete expense schema
const deleteExpenseSchema = Joi.object({
  params: Joi.object({
    expenseId: id
  })
});

// Settle expense schema
const settleExpenseSchema = Joi.object({
  params: Joi.object({
    expenseId: id
  }),
  body: Joi.object({
    settlementMethod: Joi.string().valid('cash', 'bank', 'upi', 'other').required(),
    settlementDate: date.default(Date.now),
    notes: Joi.string().max(1000),
    transactionId: Joi.string(),
    attachments: Joi.array().items(Joi.string().uri())
  }).required()
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  getExpensesSchema,
  deleteExpenseSchema,
  settleExpenseSchema
}; 