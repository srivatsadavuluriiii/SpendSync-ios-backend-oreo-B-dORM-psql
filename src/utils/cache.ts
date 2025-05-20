import Redis from 'ioredis';
import { logger } from './errors';

interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export class Cache {
  private redis: Redis;
  private readonly defaultTTL: number;
  private readonly prefix: string;

  constructor(options: CacheOptions = {}) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.defaultTTL = options.ttl || 3600; // 1 hour default TTL
    this.prefix = options.prefix || 'cache:';

    this.redis.on('error', (err) => {
      logger.error('Redis cache error:', err);
    });
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getKey(key));
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error('Cache get error:', err);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      
      await this.redis.set(this.getKey(key), serialized, 'EX', expiry);
      return true;
    } catch (err) {
      logger.error('Cache set error:', err);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.del(this.getKey(key));
      return true;
    } catch (err) {
      logger.error('Cache delete error:', err);
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return await this.redis.exists(this.getKey(key)) === 1;
    } catch (err) {
      logger.error('Cache exists error:', err);
      return false;
    }
  }

  // Batch operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const prefixedKeys = keys.map(key => this.getKey(key));
      const results = await this.redis.mget(prefixedKeys);
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (err) {
      logger.error('Cache mget error:', err);
      return keys.map(() => null);
    }
  }

  async mset(entries: { key: string; value: any; ttl?: number }[]): Promise<boolean> {
    try {
      const multi = this.redis.multi();
      
      entries.forEach(({ key, value, ttl }) => {
        const serialized = JSON.stringify(value);
        const expiry = ttl || this.defaultTTL;
        multi.set(this.getKey(key), serialized, 'EX', expiry);
      });

      await multi.exec();
      return true;
    } catch (err) {
      logger.error('Cache mset error:', err);
      return false;
    }
  }

  // Cache decorator for class methods
  static cached(ttl?: number) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      const cache = new Cache({ ttl });

      descriptor.value = async function (...args: any[]) {
        const key = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
        
        // Try to get from cache
        const cached = await cache.get(key);
        if (cached !== null) {
          return cached;
        }

        // Execute method and cache result
        const result = await originalMethod.apply(this, args);
        await cache.set(key, result, ttl);
        
        return result;
      };

      return descriptor;
    };
  }

  // Create specialized caches for different data types
  static createCaches() {
    return {
      // User analytics cache (short TTL)
      userCache: new Cache({
        ttl: 300, // 5 minutes
        prefix: 'cache:user:'
      }),

      // Aggregated analytics cache (longer TTL)
      aggregateCache: new Cache({
        ttl: 3600, // 1 hour
        prefix: 'cache:aggregate:'
      }),

      // System-wide metrics cache
      metricsCache: new Cache({
        ttl: 60, // 1 minute
        prefix: 'cache:metrics:'
      }),

      // Query results cache
      queryCache: new Cache({
        ttl: 600, // 10 minutes
        prefix: 'cache:query:'
      })
    };
  }
} 