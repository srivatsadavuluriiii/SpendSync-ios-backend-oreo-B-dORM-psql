"use strict";
/**
 * HTTP Parameter Pollution Protection Middleware
 *
 * Prevents HTTP Parameter Pollution attacks by removing duplicate query parameters.
 */
const hpp = require('hpp');
/**
 * Whitelist of parameters that can have multiple values in query strings.
 * These parameters will be preserved as arrays even if they appear multiple times.
 */
const whitelist = [
    'ids', // For batch operations with multiple IDs
    'userIds', // For filtering by multiple user IDs
    'settlementIds', // For filtering by multiple settlement IDs
    'status', // For filtering by multiple statuses
    'currencies', // For filtering by multiple currencies
];
/**
 * Configure and export HPP middleware
 */
const hppMiddleware = hpp({
    whitelist: whitelist
});
module.exports = hppMiddleware;
