import { redisClient } from './cache.js';
import { measureOperation, recordDataProcessingMetrics } from './metrics.js';
import { createLogger } from 'winston';

const logger = createLogger({
  // ... existing logger config ...
});

// Constants for processing
const CHUNK_SIZE = 1000;
const MAX_CONCURRENT_CHUNKS = 5;
const AGGREGATION_CACHE_TTL = 3600; // 1 hour

/**
 * Process data in chunks with progress tracking
 * @param {Array} data - Data array to process
 * @param {Function} processor - Processing function for each chunk
 * @param {Object} options - Processing options
 */
export const processInChunks = async (data, processor, options = {}) => {
  const {
    chunkSize = CHUNK_SIZE,
    maxConcurrent = MAX_CONCURRENT_CHUNKS,
    progressCallback
  } = options;

  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }

  let processedCount = 0;
  const results = [];

  // Process chunks with concurrency limit
  for (let i = 0; i < chunks.length; i += maxConcurrent) {
    const chunkBatch = chunks.slice(i, i + maxConcurrent);
    const startTime = Date.now();

    const batchResults = await Promise.all(
      chunkBatch.map(async (chunk) => {
        const result = await measureOperation('chunk_processing', () => processor(chunk));
        processedCount += chunk.length;
        
        if (progressCallback) {
          progressCallback({
            processed: processedCount,
            total: data.length,
            percent: (processedCount / data.length) * 100
          });
        }

        return result;
      })
    );

    const duration = (Date.now() - startTime) / 1000;
    recordDataProcessingMetrics(
      'batch_processing',
      chunkBatch.reduce((acc, chunk) => acc + chunk.length, 0),
      duration
    );

    results.push(...batchResults);
  }

  return results;
};

/**
 * Aggregate data with caching support
 * @param {string} cacheKey - Key for caching the aggregation result
 * @param {Function} aggregator - Aggregation function
 * @param {Object} options - Aggregation options
 */
export const aggregateWithCache = async (cacheKey, aggregator, options = {}) => {
  const {
    ttl = AGGREGATION_CACHE_TTL,
    forceFresh = false
  } = options;

  if (!forceFresh) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug(`Using cached aggregation for key: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.error(`Cache read error for key ${cacheKey}:`, error);
    }
  }

  const result = await measureOperation('data_aggregation', aggregator);

  try {
    await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
    logger.debug(`Cached aggregation result for key: ${cacheKey}`);
  } catch (error) {
    logger.error(`Failed to cache aggregation result for key ${cacheKey}:`, error);
  }

  return result;
};

/**
 * Process time series data with efficient chunking and caching
 * @param {Array} timeSeriesData - Array of time series data points
 * @param {Object} options - Processing options
 */
export const processTimeSeriesData = async (timeSeriesData, options = {}) => {
  const {
    interval = '1h',
    aggregationType = 'sum',
    dimensions = []
  } = options;

  const cacheKey = `timeseries:${interval}:${aggregationType}:${dimensions.join(':')}`;

  return aggregateWithCache(cacheKey, async () => {
    const chunks = await processInChunks(timeSeriesData, async (chunk) => {
      return aggregateTimeSeriesChunk(chunk, interval, aggregationType, dimensions);
    });

    return mergeTimeSeriesResults(chunks);
  });
};

/**
 * Aggregate a chunk of time series data
 * @private
 */
const aggregateTimeSeriesChunk = async (chunk, interval, aggregationType, dimensions) => {
  const result = {};

  for (const point of chunk) {
    const timeKey = getTimeKey(point.timestamp, interval);
    const dimensionKey = getDimensionKey(point, dimensions);
    const key = `${timeKey}:${dimensionKey}`;

    if (!result[key]) {
      result[key] = {
        timestamp: timeKey,
        dimensions: dimensionKey,
        value: 0,
        count: 0
      };
    }

    switch (aggregationType) {
      case 'sum':
        result[key].value += point.value;
        break;
      case 'avg':
        result[key].value += point.value;
        result[key].count++;
        break;
      case 'max':
        result[key].value = Math.max(result[key].value, point.value);
        break;
      case 'min':
        result[key].value = Math.min(result[key].value, point.value);
        break;
    }
  }

  if (aggregationType === 'avg') {
    Object.values(result).forEach(point => {
      point.value = point.value / point.count;
      delete point.count;
    });
  }

  return Object.values(result);
};

/**
 * Merge time series results from multiple chunks
 * @private
 */
const mergeTimeSeriesResults = (chunks) => {
  const merged = {};

  for (const chunk of chunks) {
    for (const point of chunk) {
      const key = `${point.timestamp}:${point.dimensions}`;
      if (!merged[key]) {
        merged[key] = point;
      } else {
        merged[key].value += point.value;
      }
    }
  }

  return Object.values(merged).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

/**
 * Get time key based on interval
 * @private
 */
const getTimeKey = (timestamp, interval) => {
  const date = new Date(timestamp);
  switch (interval) {
    case '1h':
      return date.toISOString().slice(0, 13) + ':00:00.000Z';
    case '1d':
      return date.toISOString().slice(0, 10) + 'T00:00:00.000Z';
    case '1w':
      date.setDate(date.getDate() - date.getDay());
      return date.toISOString().slice(0, 10) + 'T00:00:00.000Z';
    case '1m':
      return date.toISOString().slice(0, 7) + '-01T00:00:00.000Z';
    default:
      return date.toISOString();
  }
};

/**
 * Get dimension key from data point
 * @private
 */
const getDimensionKey = (point, dimensions) => {
  return dimensions.map(dim => point[dim] || 'unknown').join(':');
}; 