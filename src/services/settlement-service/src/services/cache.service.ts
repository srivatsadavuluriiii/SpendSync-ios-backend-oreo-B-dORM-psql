/**
 * Cache Service
 * 
 * Redis-based caching for API responses and expensive operations
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';
import { metrics } from '../config/monitoring.js';

// Cache TTL constants
export const CACHE_TTLs = {
  settlement: 3600, // 1 hour
  settlementList: 1800, // 30 minutes
  debtGraph: 300, // 5 minutes
  exchangeRates: 3600, // 1 hour
  friendships: 86400 // 24 hours
};

class CacheService {
  private redisClient: RedisClientType;
  private readonly defaultTTL: number = 3600; // 1 hour in seconds

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis max retries reached, giving up');
            return new Error('Redis max retries reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.redisClient.on('error', (err: Error) => {
      logger.error('Redis Client Error:', err);
    });

    this.redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
    }
  }

  /**
   * Generate a cache key from parts
   */
  public generateCacheKey(prefix: string, ...parts: (string | Record<string, any>)[]): string {
    const processedParts = parts.map(part => {
      if (typeof part === 'object') {
        return JSON.stringify(part);
      }
      return part;
    });
    return [prefix, ...processedParts].join(':');
  }

  /**
   * Get data from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    const timer = metrics.cacheOperationHistogram.startTimer();
    
    try {
      const data = await this.redisClient.get(key);
      if (!data) {
        metrics.cacheHitCounter.inc({ status: 'miss' });
        timer();
        return null;
      }
      metrics.cacheHitCounter.inc({ status: 'hit' });
      const parsedData = JSON.parse(data) as T;
      timer();
      return parsedData;
    } catch (error) {
      logger.error('Cache get error:', error);
      metrics.cacheErrorCounter.inc();
      timer();
      return null;
    }
  }

  /**
   * Set data in cache
   */
  public async set(key: string, data: any, ttl: number = this.defaultTTL): Promise<boolean> {
    const timer = metrics.cacheOperationHistogram.startTimer();
    
    try {
      await this.redisClient.setEx(key, ttl, JSON.stringify(data));
      metrics.cacheSetCounter.inc();
      timer();
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      metrics.cacheErrorCounter.inc();
      timer();
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  public async del(key: string): Promise<boolean> {
    const timer = metrics.cacheOperationHistogram.startTimer();
    
    try {
      await this.redisClient.del(key);
      metrics.cacheInvalidationCounter.inc({ count: '1' });
      timer();
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      metrics.cacheErrorCounter.inc();
      timer();
      return false;
    }
  }

  /**
   * Cache function result
   */
  public async cacheResult<T>(
    fn: () => Promise<T>,
    key: string,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // If not in cache, execute function
    const result = await fn();
    
    // Cache the result if it's not null/undefined
    if (result !== null && result !== undefined) {
      await this.set(key, result, ttl);
    }
    
    return result;
  }

  /**
   * Clear cache by pattern
   */
  public async clearByPattern(pattern: string): Promise<boolean> {
    const timer = metrics.cacheOperationHistogram.startTimer();
    
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        metrics.cacheInvalidationCounter.inc({ count: keys.length.toString() });
      }
      timer();
      return true;
    } catch (error) {
      logger.error('Cache clear pattern error:', error);
      metrics.cacheErrorCounter.inc();
      timer();
      return false;
    }
  }
}

export const cacheService = new CacheService(); 