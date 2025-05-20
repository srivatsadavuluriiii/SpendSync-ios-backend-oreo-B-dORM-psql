import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors';
import { logger } from '../utils/errors';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
  handler?: (req: Request, res: Response) => void;
}

export class RateLimiter {
  private redis: Redis;
  private readonly windowMs: number;
  private readonly max: number;
  private readonly keyPrefix: string;
  private readonly handler?: (req: Request, res: Response) => void;

  constructor(options: RateLimitOptions = {}) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.max = options.max || 100; // 100 requests per window
    this.keyPrefix = options.keyPrefix || 'rl:';
    this.handler = options.handler;

    // Handle Redis errors
    this.redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.getKey(req);
        const current = await this.increment(key);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', this.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, this.max - current));
        res.setHeader('X-RateLimit-Reset', await this.getResetTime(key));

        if (current > this.max) {
          if (this.handler) {
            return this.handler(req, res);
          }
          throw new RateLimitError('Too many requests');
        }

        next();
      } catch (err) {
        if (err instanceof RateLimitError) {
          next(err);
        } else {
          // If Redis is down, fail open
          logger.error('Rate limiter error:', err);
          next();
        }
      }
    };
  }

  private getKey(req: Request): string {
    // Use IP address as default key
    const identifier = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return `${this.keyPrefix}${identifier}`;
  }

  private async increment(key: string): Promise<number> {
    const multi = this.redis.multi();
    
    multi.incr(key);
    multi.pexpire(key, this.windowMs);
    
    const results = await multi.exec();
    return results ? (results[0][1] as number) : 0;
  }

  private async getResetTime(key: string): Promise<number> {
    const ttl = await this.redis.pttl(key);
    return Date.now() + (ttl < 0 ? this.windowMs : ttl);
  }

  // Create different rate limiters for different routes
  static createLimiters() {
    return {
      // Default API limiter
      defaultLimiter: new RateLimiter({
        windowMs: 60000,
        max: 100,
        keyPrefix: 'rl:default:'
      }).middleware(),

      // Analytics endpoints limiter
      analyticsLimiter: new RateLimiter({
        windowMs: 60000,
        max: 50,
        keyPrefix: 'rl:analytics:'
      }).middleware(),

      // Batch operations limiter
      batchLimiter: new RateLimiter({
        windowMs: 300000, // 5 minutes
        max: 10,
        keyPrefix: 'rl:batch:'
      }).middleware(),

      // Query endpoints limiter
      queryLimiter: new RateLimiter({
        windowMs: 60000,
        max: 30,
        keyPrefix: 'rl:query:'
      }).middleware()
    };
  }
} 