/**
 * Cache Middleware
 * 
 * Provides response caching functionality
 */

const LRU = require('lru-cache');
const config = require('../../api-gateway/config');
const { logger } = require('../utils/logger');

// Create cache instance
const cache = new LRU({
  max: config.cache?.maxItems || 1000,
  ttl: (config.cache?.ttl || 60) * 1000, // Convert to milliseconds
  updateAgeOnGet: true,
  allowStale: false
});

/**
 * Generate cache key from request
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
function generateCacheKey(req) {
  // Generate key based on method, path, query params, and auth
  const method = req.method;
  const path = req.originalUrl || req.url;
  const userId = req.user?.id || 'anonymous';
  
  // For GET requests, include query parameters in the key
  // For other methods, include body data hash
  return `${method}:${path}:${userId}`;
}

/**
 * Check if request should be cached
 * @param {Object} req - Express request object
 * @returns {boolean} Whether request should be cached
 */
function shouldCache(req) {
  if (!config.cache || !config.cache.enabled) {
    return false;
  }

  const method = req.method;
  const path = req.originalUrl || req.url;
  
  // Skip excluded methods
  if (config.cache.excluded.methods.includes(method)) {
    return false;
  }
  
  // Skip excluded paths
  if (config.cache.excluded.paths.some(excludedPath => path.startsWith(excludedPath))) {
    return false;
  }
  
  return true;
}

/**
 * Cache middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
function cacheMiddleware(options = {}) {
  return (req, res, next) => {
    // Skip caching if not enabled
    if (!shouldCache(req)) {
      return next();
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey(req);
    
    // Check if response is cached
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      logger.debug(`Cache hit for ${cacheKey}`);
      
      // Add cache headers
      res.set('X-Cache', 'HIT');
      
      // Send cached response
      res.status(cachedResponse.status)
         .set(cachedResponse.headers)
         .send(cachedResponse.body);
      return;
    }
    
    // Add cache header
    res.set('X-Cache', 'MISS');
    
    // Store original send method
    const originalSend = res.send;
    
    // Override send method to cache response
    res.send = function(body) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Store response in cache
        cache.set(cacheKey, {
          status: res.statusCode,
          headers: res.getHeaders(),
          body
        });
        
        logger.debug(`Cached response for ${cacheKey}`);
      }
      
      // Call original send method
      return originalSend.call(this, body);
    };
    
    next();
  };
}

/**
 * Clear cache for specific pattern
 * @param {string} pattern - Key pattern to clear
 * @returns {number} Number of entries cleared
 */
function clearCache(pattern = null) {
  if (!pattern) {
    // Clear entire cache
    const size = cache.size;
    cache.clear();
    logger.info(`Cleared entire cache (${size} entries)`);
    return size;
  }
  
  // Clear matching entries
  let count = 0;
  const keys = [];
  
  // Find matching keys
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      keys.push(key);
    }
  }
  
  // Delete matching keys
  for (const key of keys) {
    cache.delete(key);
    count++;
  }
  
  logger.info(`Cleared ${count} cache entries matching pattern: ${pattern}`);
  return count;
}

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  return {
    size: cache.size,
    maxSize: config.cache?.maxItems || 1000,
    ttl: config.cache?.ttl || 60,
    entries: Array.from(cache.keys()).map(key => ({
      key,
      // Size in bytes (approximate)
      size: JSON.stringify(cache.get(key)).length,
      // Time to live in seconds
      ttl: Math.floor((cache.getRemainingTTL(key) || 0) / 1000)
    }))
  };
}

module.exports = {
  cacheMiddleware,
  clearCache,
  getCacheStats
}; 