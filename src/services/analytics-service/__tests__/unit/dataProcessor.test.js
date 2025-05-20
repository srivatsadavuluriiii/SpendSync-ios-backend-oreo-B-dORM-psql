import { jest } from '@jest/globals';
import {
  processInChunks,
  aggregateWithCache,
  processTimeSeriesData
} from '../../src/utils/dataProcessor.js';
import { redisClient } from '../../src/utils/cache.js';
import { measureOperation, recordDataProcessingMetrics } from '../../src/utils/metrics.js';

// Mock dependencies
jest.mock('../../src/utils/cache.js');
jest.mock('../../src/utils/metrics.js');

describe('Data Processor Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processInChunks', () => {
    it('should process data in chunks with progress tracking', async () => {
      const testData = Array.from({ length: 2500 }, (_, i) => ({ id: i }));
      const mockProcessor = jest.fn(chunk => chunk.map(item => ({ ...item, processed: true })));
      const mockProgressCallback = jest.fn();

      const results = await processInChunks(testData, mockProcessor, {
        chunkSize: 1000,
        maxConcurrent: 2,
        progressCallback: mockProgressCallback
      });

      expect(results).toHaveLength(2500);
      expect(mockProcessor).toHaveBeenCalledTimes(3); // 2500/1000 = 3 chunks
      expect(mockProgressCallback).toHaveBeenCalledTimes(3);
      expect(recordDataProcessingMetrics).toHaveBeenCalledTimes(2); // 2 batch operations

      // Verify progress reporting
      const lastProgress = mockProgressCallback.mock.calls[2][0];
      expect(lastProgress).toEqual({
        processed: 2500,
        total: 2500,
        percent: 100
      });
    });

    it('should handle processor errors', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const mockProcessor = jest.fn().mockRejectedValue(new Error('Processing error'));

      await expect(processInChunks(testData, mockProcessor)).rejects.toThrow('Processing error');
    });
  });

  describe('aggregateWithCache', () => {
    it('should return cached result when available', async () => {
      const cachedResult = { data: 'cached' };
      redisClient.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await aggregateWithCache(
        'test:key',
        async () => ({ data: 'fresh' })
      );

      expect(result).toEqual(cachedResult);
      expect(redisClient.get).toHaveBeenCalledWith('test:key');
      expect(measureOperation).not.toHaveBeenCalled();
    });

    it('should execute and cache aggregation when no cache exists', async () => {
      const freshResult = { data: 'fresh' };
      redisClient.get.mockResolvedValue(null);
      measureOperation.mockImplementation((_, fn) => fn());

      const mockAggregator = jest.fn().mockResolvedValue(freshResult);
      const result = await aggregateWithCache('test:key', mockAggregator);

      expect(result).toEqual(freshResult);
      expect(redisClient.get).toHaveBeenCalledWith('test:key');
      expect(redisClient.setex).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify(freshResult)
      );
      expect(mockAggregator).toHaveBeenCalled();
    });

    it('should force fresh aggregation when specified', async () => {
      const freshResult = { data: 'fresh' };
      measureOperation.mockImplementation((_, fn) => fn());

      const mockAggregator = jest.fn().mockResolvedValue(freshResult);
      const result = await aggregateWithCache(
        'test:key',
        mockAggregator,
        { forceFresh: true }
      );

      expect(result).toEqual(freshResult);
      expect(redisClient.get).not.toHaveBeenCalled();
      expect(mockAggregator).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      const freshResult = { data: 'fresh' };
      redisClient.get.mockRejectedValue(new Error('Redis error'));
      measureOperation.mockImplementation((_, fn) => fn());

      const mockAggregator = jest.fn().mockResolvedValue(freshResult);
      const result = await aggregateWithCache('test:key', mockAggregator);

      expect(result).toEqual(freshResult);
      expect(mockAggregator).toHaveBeenCalled();
    });
  });

  describe('processTimeSeriesData', () => {
    const testData = [
      { timestamp: '2024-03-01T00:00:00Z', value: 10, type: 'A' },
      { timestamp: '2024-03-01T01:00:00Z', value: 20, type: 'A' },
      { timestamp: '2024-03-01T00:00:00Z', value: 15, type: 'B' },
      { timestamp: '2024-03-01T01:00:00Z', value: 25, type: 'B' }
    ];

    it('should process time series data with default options', async () => {
      redisClient.get.mockResolvedValue(null);
      measureOperation.mockImplementation((_, fn) => fn());

      const result = await processTimeSeriesData(testData);

      expect(result).toHaveLength(2); // 2 unique time periods
      expect(result[0].value).toBe(25); // Sum of values for first time period
      expect(result[1].value).toBe(45); // Sum of values for second time period
    });

    it('should process time series data with custom dimensions', async () => {
      redisClient.get.mockResolvedValue(null);
      measureOperation.mockImplementation((_, fn) => fn());

      const result = await processTimeSeriesData(testData, {
        interval: '1h',
        aggregationType: 'sum',
        dimensions: ['type']
      });

      expect(result).toHaveLength(4); // 2 time periods * 2 types
      const typeAData = result.filter(r => r.dimensions.includes('A'));
      expect(typeAData).toHaveLength(2);
      expect(typeAData[0].value).toBe(10);
      expect(typeAData[1].value).toBe(20);
    });

    it('should handle different aggregation types', async () => {
      redisClient.get.mockResolvedValue(null);
      measureOperation.mockImplementation((_, fn) => fn());

      const avgResult = await processTimeSeriesData(testData, {
        interval: '1h',
        aggregationType: 'avg'
      });

      expect(avgResult).toHaveLength(2);
      expect(avgResult[0].value).toBe(12.5); // Average of first time period
      expect(avgResult[1].value).toBe(22.5); // Average of second time period
    });

    it('should use cached results when available', async () => {
      const cachedResult = [
        { timestamp: '2024-03-01T00:00:00Z', value: 100 }
      ];
      redisClient.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await processTimeSeriesData(testData);

      expect(result).toEqual(cachedResult);
      expect(measureOperation).not.toHaveBeenCalled();
    });
  });
}); 