import Joi from 'joi';

// Common validation patterns
const patterns = {
  mongoId: /^[0-9a-fA-F]{24}$/,
  category: /^[a-zA-Z0-9-_]{2,30}$/,
};

// Common validation rules
const rules = {
  userId: Joi.string().required().min(5).max(50),
  timestamp: Joi.date().iso(),
  amount: Joi.number().min(0).max(1000000), // Reasonable maximum amount
  category: Joi.string().pattern(patterns.category),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly'),
  limit: Joi.number().integer().min(1).max(100), // Pagination limit
  page: Joi.number().integer().min(1),
};

// Request payload size limits (in bytes)
export const payloadLimits = {
  default: '10kb',
  analytics: '50kb',
  batch: '1mb',
};

// Validation schemas for different endpoints
export const schemas = {
  spending: {
    query: Joi.object({
      startDate: rules.timestamp,
      endDate: rules.timestamp.greater(Joi.ref('startDate')),
      category: rules.category,
      limit: rules.limit,
      page: rules.page,
    }),
    headers: Joi.object({
      'user-id': rules.userId,
    }).unknown(true),
  },

  insights: {
    query: Joi.object({
      timeframe: Joi.number().integer().min(1).max(12),
      categories: Joi.array().items(rules.category).max(10),
    }),
    headers: Joi.object({
      'user-id': rules.userId,
    }).unknown(true),
  },

  predictions: {
    query: Joi.object({
      months: Joi.number().integer().min(1).max(12),
      categories: Joi.array().items(rules.category).max(10),
      confidenceThreshold: Joi.number().min(0).max(1),
    }),
    headers: Joi.object({
      'user-id': rules.userId,
    }).unknown(true),
  },

  budget: {
    query: Joi.object({
      period: rules.period,
      category: rules.category,
    }),
    headers: Joi.object({
      'user-id': rules.userId,
    }).unknown(true),
  },

  analyticsEvent: {
    body: Joi.object({
      userId: rules.userId,
      category: rules.category,
      amount: rules.amount,
      timestamp: rules.timestamp,
      description: Joi.string().max(200).trim(),
      metadata: Joi.object().max(10),
    }),
  },

  batchAnalytics: {
    body: Joi.object({
      events: Joi.array().items(Joi.object({
        userId: rules.userId,
        category: rules.category,
        amount: rules.amount,
        timestamp: rules.timestamp,
        description: Joi.string().max(200).trim(),
        metadata: Joi.object().max(10),
      })).max(1000), // Maximum 1000 events per batch
    }),
  },
}; 