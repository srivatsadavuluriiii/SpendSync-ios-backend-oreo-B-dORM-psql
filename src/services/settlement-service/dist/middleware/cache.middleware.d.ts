/**
 * Create a middleware that caches API responses
 * @param {number} duration - Cache duration in seconds
 * @param {Function} keyGenerator - Function to generate a cache key from request
 * @returns {Function} Express middleware
 */
export function cacheResponse(duration?: number, keyGenerator?: Function): Function;
/**
 * Generate a cache key based on group and query parameters
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
export function generateGroupCacheKey(req: Object): string;
/**
 * Generate a cache key for settlement suggestions
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
export function generateSuggestionsCacheKey(req: Object): string;
/**
 * Clear cache entries related to a group
 * @param {string} groupId - Group ID
 * @returns {Promise<number>} Number of keys deleted
 */
export function clearGroupCache(groupId: string): Promise<number>;
/**
 * Clear cache entries related to a settlement
 * @param {string} settlementId - Settlement ID
 * @returns {Promise<boolean>} Success status
 */
export function clearSettlementCache(settlementId: string): Promise<boolean>;
