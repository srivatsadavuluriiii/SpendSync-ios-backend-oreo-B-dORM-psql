/**
 * Rate Limiter Middleware
 *
 * Implements rate limiting to protect against brute force attacks and DoS.
 * Different limits are applied based on route type.
 */
const rateLimit = require('express-rate-limit');
const { BadRequestError } = require('../../../../../shared/errors');
const requestIp = require('request-ip');
// Helper to get client IP from various headers
const getClientIp = (req) => {
    // First try to get from request-ip library
    const detectedIp = requestIp.getClientIp(req);
    if (detectedIp)
        return detectedIp;
    // Fallbacks
    return req.ip ||
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.socket.remoteAddress ||
        'unknown';
};
// Custom key generator function for rate limiter
const keyGenerator = (req) => {
    // Create a key based on IP and user ID if available
    const clientIp = getClientIp(req);
    const userId = req.user ? req.user.id : 'anonymous';
    // Use both IP and user ID to prevent user/IP combination attacks
    return `${clientIp}:${userId}`;
};
// Common options for all rate limiters
const commonOptions = {
    // Use custom key generator to handle proxies and API gateways
    keyGenerator,
    // Customize the error response when rate limit is exceeded
    handler: (req, res, next) => {
        next(new BadRequestError('Too many requests, please try again later', 'ERR_RATE_LIMIT_EXCEEDED'));
    },
    // Flag to enable tracking in headers (X-RateLimit-*)
    standardHeaders: true,
    // Disable legacy headers (X-RateLimit-*)
    legacyHeaders: false,
    // Use Redis as store in production
    // Note: Redis store requires additional setup
    // store: process.env.NODE_ENV === 'production' ? redisStore : undefined,
};
// Base API rate limiter (applies to all routes)
// 100 requests per minute
const baseRateLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after a minute'
});
// Stricter rate limiter for sensitive operations
// 5 requests per minute
const strictRateLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per windowMs
    message: 'Too many sensitive operations attempted, please try again after a minute'
});
// Settlement creation rate limiter
// 20 requests per 5 minutes
const settlementCreationLimiter = rateLimit({
    ...commonOptions,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 requests per 5 minutes
    message: 'Too many settlements created recently, please try again later'
});
// Payment operations rate limiter
// 10 requests per 5 minutes
const paymentOperationsLimiter = rateLimit({
    ...commonOptions,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 requests per 5 minutes
    message: 'Too many payment operations attempted, please try again later'
});
module.exports = {
    baseRateLimiter,
    strictRateLimiter,
    settlementCreationLimiter,
    paymentOperationsLimiter
};
export {};
//# sourceMappingURL=rate-limiter.middleware.js.map