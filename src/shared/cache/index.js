const logger = require('../utils/logger');

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
    logger.info('In-memory cache initialized');
  }

  /**
   * Get value from cache
   * @param {string} key Cache key
   * @returns {Promise<string|null>} Cached value or null
   */
  async get(key) {
    try {
      return this.cache.get(key) || null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key Cache key
   * @param {string} value Value to cache
   * @param {number} ttl Time to live in seconds
   */
  async set(key, value, ttl = 3600) {
    try {
      this.cache.set(key, value);

      // Clear any existing timeout
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
      }

      // Set expiration if ttl > 0
      if (ttl > 0) {
        const timeout = setTimeout(() => {
          this.cache.delete(key);
          this.timeouts.delete(key);
        }, ttl * 1000);
        this.timeouts.set(key, timeout);
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   * @param {string} key Cache key
   */
  async del(key) {
    try {
      this.cache.delete(key);
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
        this.timeouts.delete(key);
      }
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Get multiple values from cache
   * @param {Array<string>} keys Array of cache keys
   * @returns {Promise<Array>} Array of cached values
   */
  async mget(keys) {
    try {
      return keys.map(key => {
        const value = this.cache.get(key);
        return value ? JSON.parse(value) : null;
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   * @param {Object} keyValues Object with key-value pairs
   * @param {number} ttl Time to live in seconds
   */
  async mset(keyValues, ttl = 3600) {
    try {
      Object.entries(keyValues).forEach(([key, value]) => {
        this.set(key, JSON.stringify(value), ttl);
      });
    } catch (error) {
      logger.error('Cache mset error:', error);
    }
  }

  /**
   * Clear cache by pattern
   * @param {string} pattern Key pattern to clear
   */
  async clearPattern(pattern) {
    try {
      const regex = new RegExp(pattern.replace('*', '.*'));
      let count = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          await this.del(key);
          count++;
        }
      }

      if (count > 0) {
        logger.info(`Cleared ${count} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Cache clear pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Cache middleware for Express
   * @param {number} ttl Time to live in seconds
   * @returns {Function} Express middleware
   */
  middleware(ttl = 300) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const key = `cache:${req.originalUrl || req.url}`;

      try {
        const cached = await this.get(key);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        // Store original res.json
        const originalJson = res.json;

        // Override res.json
        res.json = async (body) => {
          // Restore original res.json
          res.json = originalJson;

          // Cache the response
          await this.set(key, JSON.stringify(body), ttl);

          // Send the response
          return res.json(body);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }
}

module.exports = new CacheManager(); 