/**
 * Cache Service
 * 
 * Redis-based caching for API responses and expensive operations
 */

const redis = require('redis');
const { metrics } = require('../config/monitoring');

// Helper function to determine if we should log
const shouldLog = () => process.env.NODE_ENV !== 'test';

// Create Redis client
const redisClient = redis.createClient({
  retry_strategy: function(options) {
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after 1 hour
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
});

// Log Redis connection events
redisClient.on('error', (err) => {
  if (shouldLog()) {
    console.error('Redis Error:', err);
  }
  metrics.cacheErrorCounter.inc();
});

redisClient.on('ready', () => {
  if (shouldLog()) {
    console.log('Redis client ready');
  }
});

redisClient.on('reconnecting', () => {
  if (shouldLog()) {
    console.log('Redis client reconnecting');
  }
});

/**
 * Check if Redis client is ready
 * @returns {boolean}
 */
function isRedisReady() {
  return redisClient && redisClient.isReady;
}

/**
 * Generate a consistent cache key format
 * @param {string} type - Type of data being cached
 * @param {string} id - Identifier for the data
 * @param {Object} params - Additional parameters to include in the key
 * @returns {string} Cache key
 */
function generateCacheKey(type, id, params = {}) {
  let key = `spendsync:${type}:${id}`;
  
  // Add any additional params to the key
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    if (paramValue !== undefined) {
      key += `:${paramKey}:${paramValue}`;
    }
  });
  
  return key;
}

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached data or null
 */
async function get(key) {
  const timer = metrics.cacheOperationHistogram.startTimer();
  
  if (!isRedisReady()) {
    if (shouldLog()) {
      console.warn('Redis client not ready, skipping cache get');
    }
    timer();
    return null;
  }
  
  try {
    return new Promise((resolve, reject) => {
      redisClient.get(key, (err, data) => {
        if (err) {
          if (shouldLog()) {
            console.error(`Cache get error for ${key}:`, err);
          }
          metrics.cacheErrorCounter.inc();
          resolve(null);
        } else if (data) {
          metrics.cacheHitCounter.inc();
          try {
            resolve(JSON.parse(data));
          } catch (parseError) {
            if (shouldLog()) {
              console.error(`Error parsing cached data for ${key}:`, parseError);
            }
            metrics.cacheErrorCounter.inc();
            resolve(null);
          }
        } else {
          resolve(null);
        }
        timer();
      });
    });
  } catch (error) {
    if (shouldLog()) {
      console.error(`Cache get exception for ${key}:`, error);
    }
    metrics.cacheErrorCounter.inc();
    timer();
    return null;
  }
}

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
async function set(key, data, ttl = 3600) {
  const timer = metrics.cacheOperationHistogram.startTimer();
  
  if (!isRedisReady()) {
    if (shouldLog()) {
      console.warn('Redis client not ready, skipping cache set');
    }
    timer();
    return false;
  }
  
  try {
    return new Promise((resolve) => {
      redisClient.set(key, JSON.stringify(data), 'EX', ttl, (err) => {
        if (err) {
          if (shouldLog()) {
            console.error(`Cache set error for ${key}:`, err);
          }
          metrics.cacheErrorCounter.inc();
          resolve(false);
        } else {
          metrics.cacheSetCounter.inc();
          resolve(true);
        }
        timer();
      });
    });
  } catch (error) {
    if (shouldLog()) {
      console.error(`Cache set exception for ${key}:`, error);
    }
    metrics.cacheErrorCounter.inc();
    timer();
    return false;
  }
}

/**
 * Delete data from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function del(key) {
  const timer = metrics.cacheOperationHistogram.startTimer();
  
  if (!isRedisReady()) {
    if (shouldLog()) {
      console.warn('Redis client not ready, skipping cache delete');
    }
    timer();
    return false;
  }
  
  try {
    return new Promise((resolve) => {
      redisClient.del(key, (err, count) => {
        if (err) {
          if (shouldLog()) {
            console.error(`Cache delete error for ${key}:`, err);
          }
          metrics.cacheErrorCounter.inc();
          resolve(false);
        } else {
          if (count > 0) {
            metrics.cacheInvalidationCounter.inc();
            resolve(true);
          } else {
            resolve(false);
          }
        }
        timer();
      });
    });
  } catch (error) {
    if (shouldLog()) {
      console.error(`Cache delete exception for ${key}:`, error);
    }
    metrics.cacheErrorCounter.inc();
    timer();
    return false;
  }
}

/**
 * Cache function result
 * @param {Function} fn - Function to execute and cache
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Function result
 */
async function cacheResult(fn, key, ttl = 3600) {
  try {
    // Try to get from cache first
    const cachedResult = await get(key);
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    // No cache hit, execute function
    const result = await fn();
    
    // Cache the result for future calls
    await set(key, result, ttl);
    
    return result;
  } catch (error) {
    if (shouldLog()) {
      console.error(`Cache result exception for ${key}:`, error);
    }
    
    // If cache fails, just execute the function
    return fn();
  }
}

/**
 * Clear cache entries by pattern
 * @param {string} pattern - Pattern to match
 * @returns {Promise<number>} Number of keys cleared
 */
async function clearByPattern(pattern) {
  const timer = metrics.cacheOperationHistogram.startTimer();
  
  if (!isRedisReady()) {
    if (shouldLog()) {
      console.warn('Redis client not ready, skipping cache clear');
    }
    timer();
    return 0;
  }
  
  try {
    return new Promise((resolve) => {
      redisClient.keys(pattern, (err, keys) => {
        if (err || !keys || keys.length === 0) {
          if (shouldLog()) {
            console.log(`No keys found for pattern ${pattern}`);
          }
          timer();
          resolve(0);
          return;
        }
        
        redisClient.del(keys, (delErr, count) => {
          if (delErr) {
            if (shouldLog()) {
              console.error(`Failed to delete keys for pattern ${pattern}:`, delErr);
            }
            metrics.cacheErrorCounter.inc();
            resolve(0);
          } else {
            if (shouldLog()) {
              console.log(`Cleared ${count} keys for pattern ${pattern}`);
            }
            metrics.cacheInvalidationCounter.inc(count);
            resolve(count);
          }
          timer();
        });
      });
    });
  } catch (error) {
    if (shouldLog()) {
      console.error(`Clear by pattern exception for ${pattern}:`, error);
    }
    metrics.cacheErrorCounter.inc();
    timer();
    return 0;
  }
}

module.exports = {
  redisClient,
  generateCacheKey,
  get,
  set,
  del,
  cacheResult,
  clearByPattern,
  isRedisReady
}; 