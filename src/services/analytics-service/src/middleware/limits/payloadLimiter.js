import express from 'express';
import { payloadLimits } from '../validation/schemas.js';

export class PayloadTooLargeError extends Error {
  constructor(limit) {
    super(`Payload size exceeds limit of ${limit}`);
    this.name = 'PayloadTooLargeError';
    this.status = 413;
  }
}

/**
 * Factory function to create payload limit middleware
 * @param {string} type - Type of limit to apply (default, analytics, batch)
 * @returns {Function} Express middleware
 */
export const limitPayloadSize = (type = 'default') => {
  const limit = payloadLimits[type] || payloadLimits.default;
  
  // Create middleware using express.json() with size limit
  const jsonParser = express.json({
    limit: limit,
    strict: true,
    verify: (req, res, buf) => {
      // Store raw body for potential signature verification
      req.rawBody = buf;
    }
  });

  // Wrap the middleware to catch payload size errors
  return (req, res, next) => {
    jsonParser(req, res, (err) => {
      if (err) {
        if (err.type === 'entity.too.large') {
          next(new PayloadTooLargeError(limit));
        } else {
          next(err);
        }
      } else {
        next();
      }
    });
  };
};

/**
 * Apply different limits based on route
 */
export const routeSpecificLimits = {
  '/analytics/events/batch': limitPayloadSize('batch'),
  '/analytics/insights': limitPayloadSize('analytics'),
  '/analytics/predictions': limitPayloadSize('analytics'),
  default: limitPayloadSize('default')
}; 