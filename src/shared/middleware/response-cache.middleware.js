/**
 * Response Cache Middleware
 * 
 * Implements in-memory caching for API responses to reduce memory usage
 * and improve response times.
 */

const LRU = require('lru-cache');
const config = require('../../config/monitoring.config');
const { logger } = require('./request-logger.middleware');

class ResponseCacheMiddleware {
  constructor() {
    this.cache = new LRU({
      maxSize: config.cache.maxSize,
      sizeCalculation: (value, key) => {
        if (Buffer.isBuffer(value)) return value.length;
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
      },
      ttl: config.cache.defaultTTL * 1000,
      updateAgeOnGet: true,
      allowStale: false
    });

    // Compile regex patterns
    this.rules = Object.entries(config.cache.rules).map(([pattern, rule]) => ({
      regex: new RegExp(pattern),
      ...rule
    }));

    this.excludePatterns = config.cache.exclude.map(pattern => new RegExp(pattern));

    // Log cache creation
    logger.info('Response cache initialized', {
      maxSize: config.cache.maxSize,
      defaultTTL: config.cache.defaultTTL,
      rules: Object.keys(config.cache.rules).length,
      excludePatterns: config.cache.exclude.length
    });
  }

  /**
   * Get cache key for request
   */
  getCacheKey(req) {
    return `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
  }

  /**
   * Check if request should be cached
   */
  shouldCache(req) {
    // Don't cache if disabled
    if (!config.cache.enabled) return false;

    // Don't cache non-GET requests by default
    if (req.method !== 'GET') return false;

    // Check exclude patterns
    if (this.excludePatterns.some(regex => regex.test(req.path))) {
      return false;
    }

    // Check cache rules
    const matchingRule = this.rules.find(rule => rule.regex.test(req.path));
    if (matchingRule) {
      return matchingRule.methods.includes(req.method);
    }

    return false;
  }

  /**
   * Get TTL for request
   */
  getTTL(req) {
    const matchingRule = this.rules.find(rule => rule.regex.test(req.path));
    return (matchingRule?.ttl || config.cache.defaultTTL) * 1000;
  }

  /**
   * Main middleware function
   */
  handle() {
    return async (req, res, next) => {
      // Skip if shouldn't cache
      if (!this.shouldCache(req)) {
        return next();
      }

      const cacheKey = this.getCacheKey(req);

      try {
        // Try to get from cache
        const cachedResponse = this.cache.get(cacheKey);
        if (cachedResponse) {
          logger.debug('Cache hit', { path: req.path, key: cacheKey });
          return res.json(cachedResponse);
        }

        // Cache miss - wrap response.json
        const originalJson = res.json.bind(res);
        res.json = (data) => {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const ttl = this.getTTL(req);
              this.cache.set(cacheKey, data, { ttl });
              logger.debug('Cached response', { 
                path: req.path, 
                key: cacheKey,
                ttl,
                size: Buffer.byteLength(JSON.stringify(data))
              });
            } catch (err) {
              logger.error('Failed to cache response', {
                error: err.message,
                path: req.path,
                key: cacheKey
              });
            }
          }
          return originalJson(data);
        };

        next();
      } catch (err) {
        logger.error('Cache error', {
          error: err.message,
          path: req.path,
          key: cacheKey
        });
        next();
      }
    };
  }

  /**
   * Clear cache for specific pattern
   */
  clearCache(pattern) {
    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    let cleared = 0;

    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    });

    logger.info('Cache cleared', { pattern, cleared });
    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: config.cache.maxSize,
      itemCount: this.cache.size,
      ratio: this.cache.size / config.cache.maxSize,
      ttl: config.cache.defaultTTL
    };
  }
}

module.exports = new ResponseCacheMiddleware(); 