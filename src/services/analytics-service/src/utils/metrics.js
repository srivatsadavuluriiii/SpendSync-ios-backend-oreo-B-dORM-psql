import client from 'prom-client';
import { createLogger } from 'winston';

const logger = createLogger({
  // ... existing logger config ...
});

// Enable default metrics collection
client.collectDefaultMetrics();

// Analytics Operation Metrics
export const analyticsOperationDuration = new client.Histogram({
  name: 'analytics_operation_duration_seconds',
  help: 'Duration of analytics operations',
  labelNames: ['operation', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const analyticsOperationTotal = new client.Counter({
  name: 'analytics_operation_total',
  help: 'Total number of analytics operations',
  labelNames: ['operation', 'status']
});

// Cache Metrics
export const cacheHits = new client.Counter({
  name: 'analytics_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

export const cacheMisses = new client.Counter({
  name: 'analytics_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

// Data Processing Metrics
export const dataProcessingBatchSize = new client.Histogram({
  name: 'analytics_data_processing_batch_size',
  help: 'Size of data processing batches',
  buckets: [10, 50, 100, 500, 1000]
});

export const dataProcessingDuration = new client.Histogram({
  name: 'analytics_data_processing_duration_seconds',
  help: 'Duration of data processing operations',
  labelNames: ['operation_type'],
  buckets: [1, 5, 10, 30, 60]
});

// Business Metrics
export const activeUserMetrics = new client.Gauge({
  name: 'analytics_active_users',
  help: 'Number of active users in different time periods',
  labelNames: ['time_period'] // daily, weekly, monthly
});

export const transactionVolume = new client.Gauge({
  name: 'analytics_transaction_volume',
  help: 'Volume of transactions processed',
  labelNames: ['transaction_type']
});

// Error Metrics
export const errorRate = new client.Counter({
  name: 'analytics_errors_total',
  help: 'Total number of errors in analytics operations',
  labelNames: ['error_type', 'operation']
});

/**
 * Measure operation duration with automatic metrics recording
 * @param {string} operation - Name of the operation
 * @param {Function} fn - Async function to measure
 */
export const measureOperation = async (operation, fn) => {
  const end = analyticsOperationDuration.startTimer({ operation });
  try {
    const result = await fn();
    analyticsOperationTotal.inc({ operation, status: 'success' });
    end({ status: 'success' });
    return result;
  } catch (error) {
    analyticsOperationTotal.inc({ operation, status: 'error' });
    errorRate.inc({ error_type: error.name, operation });
    end({ status: 'error' });
    throw error;
  }
};

/**
 * Record business metrics
 * @param {string} metric - Metric name
 * @param {Object} labels - Metric labels
 * @param {number} value - Metric value
 */
export const recordBusinessMetric = (metric, labels, value) => {
  try {
    switch (metric) {
      case 'active_users':
        activeUserMetrics.set(labels, value);
        break;
      case 'transaction_volume':
        transactionVolume.set(labels, value);
        break;
      default:
        logger.warn(`Unknown business metric: ${metric}`);
    }
  } catch (error) {
    logger.error(`Failed to record business metric ${metric}:`, error);
    errorRate.inc({ error_type: 'metric_recording', operation: metric });
  }
};

/**
 * Record cache operation metrics
 * @param {string} cacheType - Type of cache
 * @param {boolean} isHit - Whether operation was a cache hit
 */
export const recordCacheMetric = (cacheType, isHit) => {
  if (isHit) {
    cacheHits.inc({ cache_type: cacheType });
  } else {
    cacheMisses.inc({ cache_type: cacheType });
  }
};

/**
 * Record data processing metrics
 * @param {string} operationType - Type of data processing operation
 * @param {number} batchSize - Size of the processed batch
 * @param {number} duration - Duration in seconds
 */
export const recordDataProcessingMetrics = (operationType, batchSize, duration) => {
  dataProcessingBatchSize.observe(batchSize);
  dataProcessingDuration.observe({ operation_type: operationType }, duration);
};

// Export the Prometheus client for direct access if needed
export const prometheusClient = client; 