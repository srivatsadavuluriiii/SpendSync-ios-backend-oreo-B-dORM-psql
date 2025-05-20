import { jest } from '@jest/globals';
import Redis from 'ioredis';
import {
  withCache,
  batchCacheOperations,
  clearCacheByPattern,
  CACHE_TTL,
  redisClient
} from '../../src/utils/cache.js';

// Mock Redis
jest.mock('ioredis');

describe('Cache Utilities', () => {
  let mockRedis;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup Redis mock
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      pipeline: jest.fn(),
      keys: jest.fn(),
      del: jest.fn()
    };
    
    // Mock pipeline operations
    mockRedis.pipeline.mockReturnValue({
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    });

    Redis.mockImplementation(() => mockRedis);
  });

  describe('withCache Decorator', () => {
    it('should return cached value when available', async () => {
      const cachedValue = { data: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedValue));

      class TestClass {
        @withCache('user', () => 'testKey')
        async getData() {
          return { fresh: 'data' };
        }
      }

      const instance = new TestClass();
      const result = await instance.getData();

      expect(result).toEqual(cachedValue);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should cache result when no cached value exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      class TestClass {
        @withCache('user', () => 'testKey')
        async getData() {
          return { fresh: 'data' };
        }
      }

      const instance = new TestClass();
      const result = await instance.getData();

      expect(result).toEqual({ fresh: 'data' });
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        CACHE_TTL.USER_METRICS,
        JSON.stringify({ fresh: 'data' })
      );
    });

    it('should handle cache errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      class TestClass {
        @withCache('user', () => 'testKey')
        async getData() {
          return { fresh: 'data' };
        }
      }

      const instance = new TestClass();
      const result = await instance.getData();

      expect(result).toEqual({ fresh: 'data' });
      expect(mockRedis.get).toHaveBeenCalled();
    });
  });

  describe('batchCacheOperations', () => {
    it('should execute batch operations successfully', async () => {
      const operations = [
        { key: 'key1', value: 'value1', ttl: 300 },
        { key: 'key2', value: 'value2', ttl: 600 }
      ];

      await batchCacheOperations(operations);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      const pipeline = mockRedis.pipeline();
      expect(pipeline.setex).toHaveBeenCalledTimes(2);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should handle batch operation errors', async () => {
      const operations = [
        { key: 'key1', value: 'value1', ttl: 300 }
      ];

      mockRedis.pipeline.mockReturnValue({
        setex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Pipeline error'))
      });

      await expect(batchCacheOperations(operations)).rejects.toThrow('Pipeline error');
    });
  });

  describe('clearCacheByPattern', () => {
    it('should clear cache entries matching pattern', async () => {
      const keys = ['key1', 'key2'];
      mockRedis.keys.mockResolvedValue(keys);

      await clearCacheByPattern('test*');

      expect(mockRedis.keys).toHaveBeenCalledWith('test*');
      expect(mockRedis.del).toHaveBeenCalledWith(keys);
    });

    it('should handle no matching keys', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await clearCacheByPattern('test*');

      expect(mockRedis.keys).toHaveBeenCalledWith('test*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle errors during cache clearing', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      await expect(clearCacheByPattern('test*')).rejects.toThrow('Redis error');
    });
  });
}); 