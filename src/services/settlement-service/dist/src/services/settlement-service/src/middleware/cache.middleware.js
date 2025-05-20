"use strict";
/**
 * Cache Middleware
 *
 * Provides response caching for API endpoints
 */
const cacheService = require('../services/cache.service');
/**
 * Create a middleware that caches API responses
 * @param {number} duration - Cache duration in seconds
 * @param {Function} keyGenerator - Function to generate a cache key from request
 * @returns {Function} Express middleware
 */
function cacheResponse(duration = 60, keyGenerator = null) {
    return async (req, res, next) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }
        try {
            // Generate a cache key based on the request
            const key = keyGenerator ?
                keyGenerator(req) :
                `api:${req.originalUrl || req.url}:${req.user ? req.user.id : 'nouser'}`;
            // Try to get from cache
            const cachedResponse = await cacheService.get(key);
            if (cachedResponse) {
                return res.json(cachedResponse);
            }
            // If not in cache, cache the response
            const originalSend = res.json;
            res.json = function (data) {
                // Restore original json method
                res.json = originalSend;
                // Cache the response data
                if (res.statusCode === 200 || res.statusCode === 201) {
                    cacheService.set(key, data, duration);
                }
                // Send the response
                return originalSend.call(this, data);
            };
            next();
        }
        catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
}
/**
 * Generate a cache key based on group and query parameters
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
function generateGroupCacheKey(req) {
    const { groupId } = req.params;
    const { status, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const userId = req.user ? req.user.id : 'anonymous';
    return cacheService.generateCacheKey('api', `group-${groupId}`, {
        status,
        limit,
        offset,
        sortBy,
        sortOrder,
        userId
    });
}
/**
 * Generate a cache key for settlement suggestions
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
function generateSuggestionsCacheKey(req) {
    const { groupId } = req.params;
    const { algorithm, includeFriendships = 'false' } = req.query;
    const userId = req.user ? req.user.id : 'anonymous';
    // If algorithm is not provided in query, we'll need to include the user's
    // preferred algorithm in the cache key since it affects the response
    const useUserPrefs = !algorithm;
    return cacheService.generateCacheKey('api', `suggestions-${groupId}`, {
        algorithm: algorithm || 'userPref', // 'userPref' indicates we'll use user preferences
        includeFriendships,
        userId,
        useUserPrefs // Flag to indicate if we're using user preferences (affects cache key)
    });
}
/**
 * Clear cache entries related to a group
 * @param {string} groupId - Group ID
 * @returns {Promise<number>} Number of keys deleted
 */
async function clearGroupCache(groupId) {
    const pattern = `spendsync:api:group-${groupId}*`;
    const suggestionsPattern = `spendsync:api:suggestions-${groupId}*`;
    const groupKeysDeleted = await cacheService.clearByPattern(pattern);
    const suggestionKeysDeleted = await cacheService.clearByPattern(suggestionsPattern);
    return groupKeysDeleted + suggestionKeysDeleted;
}
/**
 * Clear cache entries related to a settlement
 * @param {string} settlementId - Settlement ID
 * @returns {Promise<boolean>} Success status
 */
async function clearSettlementCache(settlementId) {
    const key = cacheService.generateCacheKey('settlement', settlementId);
    return await cacheService.del(key);
}
module.exports = {
    cacheResponse,
    generateGroupCacheKey,
    generateSuggestionsCacheKey,
    clearGroupCache,
    clearSettlementCache
};
