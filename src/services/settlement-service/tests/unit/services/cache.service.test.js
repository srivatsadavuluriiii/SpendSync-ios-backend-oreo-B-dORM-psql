/**
 * Cache Service Tests
 * 
 * Tests for the cache service
 */

const redis = require('redis');

// Create mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  on: jest.fn(),
  quit: jest.fn(),
  isReady: true
};

// Mock the Redis client module
jest.mock('redis', () => ({
  createClient: () => {
    // Simulate Redis ready event
    setTimeout(() => {
      const readyHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'ready')?.[1];
      if (readyHandler) readyHandler();
    }, 0);
    return mockRedisClient;
  }
}));

// Mock the metrics
jest.mock('../../../src/config/monitoring', () => ({
  metrics: {
    cacheOperationHistogram: {
      startTimer: jest.fn().mockReturnValue(jest.fn())
    },
    cacheHitCounter: {
      inc: jest.fn()
    },
    cacheSetCounter: {
      inc: jest.fn()
    },
    cacheErrorCounter: {
      inc: jest.fn()
    },
    cacheInvalidationCounter: {
      inc: jest.fn()
    }
  }
}));

// Import the cache service functions
const {
  generateCacheKey,
  get,
  set,
  del,
  cacheResult,
  clearByPattern
} = require('../../../src/services/cache.service');

describe('Cache Service', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockRedisClient.get.mockImplementation((key, callback) => callback(null, null));
    mockRedisClient.set.mockImplementation((key, value, flag, ttl, callback) => callback(null, 'OK'));
    mockRedisClient.del.mockImplementation((key, callback) => callback(null, 1));
    mockRedisClient.keys.mockImplementation((pattern, callback) => callback(null, []));
    
    // Reset isReady flag
    mockRedisClient.isReady = true;
  });

  afterEach(() => {
    // Restore console spies
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    mockRedisClient.quit.mockClear();
  });

  describe('generateCacheKey', () => {
    it('should generate a proper cache key with type and id', () => {
      const key = generateCacheKey('user', '123');
      expect(key).toBe('spendsync:user:123');
    });
    
    it('should include parameters in the cache key', () => {
      const key = generateCacheKey('settlement', '456', { status: 'pending', currency: 'USD' });
      expect(key).toBe('spendsync:settlement:456:status:pending:currency:USD');
    });
    
    it('should filter out undefined parameters', () => {
      const key = generateCacheKey('expense', '789', { amount: 100, description: undefined });
      expect(key).toBe('spendsync:expense:789:amount:100');
    });
  });
  
  describe('get', () => {
    it('should get cached data successfully', async () => {
      const key = 'test-key';
      const mockData = { test: 'data' };
      
      mockRedisClient.get.mockImplementation((key, callback) => {
        callback(null, JSON.stringify(mockData));
      });

      const result = await get(key);
      expect(result).toEqual(mockData);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      
      mockRedisClient.get.mockImplementation((key, callback) => {
        callback(new Error('Redis error'));
      });

      const result = await get(key);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cache get error for test-key:',
        expect.any(Error)
      );
    });
  });
  
  describe('set', () => {
    it('should set cache data successfully', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      const ttl = 3600;

      mockRedisClient.set.mockImplementation((key, value, flag, ttl, callback) => {
        callback(null, 'OK');
      });

      const result = await set(key, data, ttl);
      expect(result).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      const ttl = 3600;

      mockRedisClient.set.mockImplementation((key, value, flag, ttl, callback) => {
        callback(new Error('Redis error'));
      });

      const result = await set(key, data, ttl);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cache set error for test-key:',
        expect.any(Error)
      );
    });
  });
  
  describe('del', () => {
    it('should delete cache data successfully', async () => {
      const key = 'test-key';

      mockRedisClient.del.mockImplementation((key, callback) => {
        callback(null, 1);
      });

      const result = await del(key);
      expect(result).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';

      mockRedisClient.del.mockImplementation((key, callback) => {
        callback(new Error('Redis error'));
      });

      const result = await del(key);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cache delete error for test-key:',
        expect.any(Error)
      );
    });
  });
  
  describe('cacheResult', () => {
    it('should return cached value if available', async () => {
      const cachedValue = { data: 'cached' };
      mockRedisClient.get.mockImplementation((key, cb) => {
        cb(null, JSON.stringify(cachedValue));
      });
      
      const fn = jest.fn();
      
      const result = await cacheResult(fn, 'test-key');
      
      expect(fn).not.toHaveBeenCalled();
      expect(result).toEqual(cachedValue);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    
    it('should execute function and cache result if not cached', async () => {
      mockRedisClient.get.mockImplementation((key, cb) => {
        cb(null, null);
      });
      
      mockRedisClient.set.mockImplementation((key, value, ex, ttl, cb) => {
        cb(null, 'OK');
      });
      
      const fnResult = { data: 'original' };
      const fn = jest.fn().mockResolvedValue(fnResult);
      
      const result = await cacheResult(fn, 'test-key');
      
      expect(fn).toHaveBeenCalled();
      expect(result).toEqual(fnResult);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(fnResult),
        'EX',
        3600,
        expect.any(Function)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('clearPattern', () => {
    it('should clear cache by pattern successfully', async () => {
      const pattern = 'test*';
      const mockKeys = ['test1', 'test2', 'test3'];

      mockRedisClient.keys.mockImplementation((pattern, callback) => {
        callback(null, mockKeys);
      });

      mockRedisClient.del.mockImplementation((keys, callback) => {
        callback(null, keys.length);
      });

      const result = await clearByPattern(pattern);
      expect(result).toBe(mockKeys.length);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Cleared ${mockKeys.length} keys for pattern ${pattern}`);
    });

    it('should handle no keys found', async () => {
      const pattern = 'test*';

      mockRedisClient.keys.mockImplementation((pattern, callback) => {
        callback(null, []);
      });

      const result = await clearByPattern(pattern);
      expect(result).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(`No keys found for pattern ${pattern}`);
    });

    it('should handle Redis errors gracefully', async () => {
      const pattern = 'test*';

      mockRedisClient.keys.mockImplementation((pattern, callback) => {
        callback(new Error('Redis error'));
      });

      const result = await clearByPattern(pattern);
      expect(result).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
}); 