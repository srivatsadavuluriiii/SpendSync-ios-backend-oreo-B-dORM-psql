/**
 * Rate limiting middleware
 * 
 * Implements rate limiting to protect API endpoints from abuse
 * and ensure fair usage across services.
 */

const rateLimit = require('express-rate-limit');
const config = require('../../config');

/**
 * Create a rate limiter middleware with default settings
 * @returns {Function} Rate limiting middleware
 */
const createRateLimiter = () => {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: config.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false
  });
};

/**
 * Create an IP-based rate limiter with custom settings
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Rate limiting middleware
 */
const ipRateLimit = (maxRequests = 100, windowMs = 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: config.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip
  });
};

/**
 * Create a user-based rate limiter with custom settings
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Rate limiting middleware
 */
const userRateLimit = (maxRequests = 200, windowMs = 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: config.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user ? req.user.id : req.ip
  });
};

module.exports = {
  createRateLimiter,
  ipRateLimit,
  userRateLimit
}; 