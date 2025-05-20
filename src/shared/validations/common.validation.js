const Joi = require('joi');

/**
 * Common validation schemas that can be reused across different endpoints
 */

// UUID validation
const uuidSchema = Joi.string().guid({ version: 'uuidv4' });

// MongoDB ObjectId validation
const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

// Currency validation
const currencySchema = Joi.string().length(3).uppercase();

// Amount validation
const amountSchema = Joi.number().precision(2).positive();

// Date validation
const dateSchema = Joi.date().iso();

// Pagination validation
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Common expense fields
const expenseCommonFields = {
  description: Joi.string().trim().max(255),
  amount: amountSchema.required(),
  currency: currencySchema.default('USD'),
  date: dateSchema.default(Date.now),
  category: Joi.string().trim().max(50),
  notes: Joi.string().trim().max(1000),
  receipt: Joi.string().uri()
};

// Common user fields
const userCommonFields = {
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  name: Joi.string().max(100),
  avatar: Joi.string().uri(),
  timezone: Joi.string().max(50),
  language: Joi.string().length(2)
};

// Common group fields
const groupCommonFields = {
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500),
  currency: currencySchema.default('USD'),
  avatar: Joi.string().uri(),
  isPrivate: Joi.boolean().default(false)
};

// Split types
const splitTypes = ['equal', 'percentage', 'fixed', 'share'];

// Common split fields
const splitCommonFields = {
  userId: objectIdSchema.required(),
  splitType: Joi.string().valid(...splitTypes).required(),
  amount: amountSchema.when('splitType', {
    is: 'fixed',
    then: Joi.required()
  }),
  percentage: Joi.number().min(0).max(100).when('splitType', {
    is: 'percentage',
    then: Joi.required()
  }),
  shares: Joi.number().integer().min(1).when('splitType', {
    is: 'share',
    then: Joi.required()
  })
};

module.exports = {
  uuidSchema,
  objectIdSchema,
  currencySchema,
  amountSchema,
  dateSchema,
  paginationSchema,
  expenseCommonFields,
  userCommonFields,
  groupCommonFields,
  splitTypes,
  splitCommonFields
}; 