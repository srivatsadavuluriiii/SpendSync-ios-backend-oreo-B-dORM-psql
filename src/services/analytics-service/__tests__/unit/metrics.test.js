import { jest } from '@jest/globals';
import client from 'prom-client';
import {
  measureOperation,
  recordBusinessMetric,
  recordCacheMetric,
  recordDataProcessingMetrics,
  analyticsOperationDuration,
  analyticsOperationTotal,
  cacheHits,
  cacheMisses,
  dataProcessingBatchSize,
  dataProcessingDuration,
  activeUserMetrics,
  transactionVolume,
  errorRate
} from '../../src/utils/metrics.js';

// Mock prom-client
jest.mock('prom-client', () => ({
  Histogram: jest.fn().mockImplementation(() => ({
    startTimer: jest.fn().mockReturnValue(jest.fn()),
    observe: jest.fn()
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn()
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn()
  })),
  collectDefaultMetrics: jest.fn()
}));

describe('Metrics Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('measureOperation', () => {
    it('should measure successful operation', async () => {
      const mockEnd = jest.fn();
      analyticsOperationDuration.startTimer.mockReturnValue(mockEnd);

      const operation = 'test_operation';
      const result = await measureOperation(operation, async () => 'success');

      expect(result).toBe('success');
      expect(analyticsOperationDuration.startTimer).toHaveBeenCalledWith({ operation });
      expect(mockEnd).toHaveBeenCalledWith({ status: 'success' });
      expect(analyticsOperationTotal.inc).toHaveBeenCalledWith({
        operation,
        status: 'success'
      });
    });

    it('should handle and measure failed operation', async () => {
      const mockEnd = jest.fn();
      analyticsOperationDuration.startTimer.mockReturnValue(mockEnd);

      const operation = 'test_operation';
      const error = new Error('Test error');

      await expect(measureOperation(operation, async () => {
        throw error;
      })).rejects.toThrow('Test error');

      expect(mockEnd).toHaveBeenCalledWith({ status: 'error' });
      expect(analyticsOperationTotal.inc).toHaveBeenCalledWith({
        operation,
        status: 'error'
      });
      expect(errorRate.inc).toHaveBeenCalledWith({
        error_type: 'Error',
        operation
      });
    });
  });

  describe('recordBusinessMetric', () => {
    it('should record active users metric', () => {
      const labels = { time_period: 'daily' };
      const value = 100;

      recordBusinessMetric('active_users', labels, value);

      expect(activeUserMetrics.set).toHaveBeenCalledWith(labels, value);
    });

    it('should record transaction volume metric', () => {
      const labels = { transaction_type: 'purchase' };
      const value = 1000;

      recordBusinessMetric('transaction_volume', labels, value);

      expect(transactionVolume.set).toHaveBeenCalledWith(labels, value);
    });

    it('should handle unknown metric type', () => {
      const labels = { type: 'unknown' };
      const value = 100;

      recordBusinessMetric('unknown_metric', labels, value);

      expect(activeUserMetrics.set).not.toHaveBeenCalled();
      expect(transactionVolume.set).not.toHaveBeenCalled();
      expect(errorRate.inc).not.toHaveBeenCalled();
    });

    it('should handle metric recording errors', () => {
      const labels = { time_period: 'daily' };
      const value = 100;

      activeUserMetrics.set.mockImplementation(() => {
        throw new Error('Metric error');
      });

      recordBusinessMetric('active_users', labels, value);

      expect(errorRate.inc).toHaveBeenCalledWith({
        error_type: 'metric_recording',
        operation: 'active_users'
      });
    });
  });

  describe('recordCacheMetric', () => {
    it('should record cache hit', () => {
      const cacheType = 'user_data';

      recordCacheMetric(cacheType, true);

      expect(cacheHits.inc).toHaveBeenCalledWith({ cache_type: cacheType });
      expect(cacheMisses.inc).not.toHaveBeenCalled();
    });

    it('should record cache miss', () => {
      const cacheType = 'user_data';

      recordCacheMetric(cacheType, false);

      expect(cacheMisses.inc).toHaveBeenCalledWith({ cache_type: cacheType });
      expect(cacheHits.inc).not.toHaveBeenCalled();
    });
  });

  describe('recordDataProcessingMetrics', () => {
    it('should record processing metrics', () => {
      const operationType = 'batch_process';
      const batchSize = 100;
      const duration = 1.5;

      recordDataProcessingMetrics(operationType, batchSize, duration);

      expect(dataProcessingBatchSize.observe).toHaveBeenCalledWith(batchSize);
      expect(dataProcessingDuration.observe).toHaveBeenCalledWith(
        { operation_type: operationType },
        duration
      );
    });
  });
}); 