/**
 * In-memory cache implementation for analytics service
 */

class AnalyticsCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  async get(key) {
    try {
      const value = this.cache.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setex(key, ttl, value) {
    try {
      const stringValue = JSON.stringify(value);
      this.cache.set(key, stringValue);

      // Clear existing timeout if any
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
      }

      // Set new timeout for TTL
      if (ttl > 0) {
        const timeout = setTimeout(() => {
          this.cache.delete(key);
          this.timeouts.delete(key);
        }, ttl * 1000);
        this.timeouts.set(key, timeout);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async keys(pattern) {
    try {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Array.from(this.cache.keys()).filter(key => regex.test(key));
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }

  async del(keys) {
    try {
      if (!Array.isArray(keys)) {
        keys = [keys];
      }
      
      keys.forEach(key => {
        this.cache.delete(key);
        if (this.timeouts.has(key)) {
          clearTimeout(this.timeouts.get(key));
          this.timeouts.delete(key);
        }
      });
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async ping() {
    return 'PONG';
  }

  async quit() {
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.cache.clear();
    this.timeouts.clear();
  }
}

// Create and export singleton instance
const cache = new AnalyticsCache();
export const redisClient = cache; // For backward compatibility
export default cache;

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  USER_METRICS: 300,      // 5 minutes
  AGGREGATES: 3600,       // 1 hour
  REAL_TIME: 60,         // 1 minute
  QUERY_CACHE: 600       // 10 minutes
};

// Cache key prefixes
const KEY_PREFIX = {
  USER: 'user:metrics:',
  AGGREGATE: 'aggregate:',
  REALTIME: 'realtime:',
  QUERY: 'query:'
};

/**
 * Generic cache decorator for method-level caching
 * @param {string} type - Cache type (user, aggregate, realtime, query)
 * @param {Function} keyGenerator - Function to generate cache key from method arguments
 */
export const withCache = (type, keyGenerator) => {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const cacheKey = `${KEY_PREFIX[type.toUpperCase()]}${keyGenerator(...args)}`;
      const ttl = CACHE_TTL[`${type.toUpperCase()}_METRICS`];

      try {
        // Try to get from cache
        const cachedValue = await cache.get(cacheKey);
        if (cachedValue) {
          console.debug(`Cache hit for key: ${cacheKey}`);
          return cachedValue;
        }

        // If not in cache, execute method and cache result
        const result = await originalMethod.apply(this, args);
        await cache.setex(cacheKey, ttl, result);
        console.debug(`Cached result for key: ${cacheKey}`);
        return result;
      } catch (error) {
        console.error(`Cache error for key ${cacheKey}:`, error);
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
};

/**
 * Batch cache operations for efficiency
 * @param {Array<{key: string, value: any, ttl: number}>} operations 
 */
export const batchCacheOperations = async (operations) => {
  const pipeline = new Map();
  
  operations.forEach(({ key, value, ttl }) => {
    pipeline.set(key, value);
  });

  try {
    await Promise.all(Array.from(pipeline.entries()).map(([key, value]) => cache.setex(key, ttl, value)));
    console.debug(`Batch cache operation completed for ${operations.length} items`);
  } catch (error) {
    console.error('Batch cache operation failed:', error);
    throw error;
  }
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Cache key pattern to clear
 */
export const clearCacheByPattern = async (pattern) => {
  try {
    const keys = await cache.keys(pattern);
    if (keys.length > 0) {
      await cache.del(keys);
      console.info(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error(`Failed to clear cache for pattern ${pattern}:`, error);
    throw error;
  }
}; 