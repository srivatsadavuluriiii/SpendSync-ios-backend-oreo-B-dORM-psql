/**
 * Memory Optimization Middleware
 * 
 * Implements various memory optimization strategies:
 * 1. Request body size limits
 * 2. Response streaming for large datasets
 * 3. Automatic garbage collection triggering
 * 4. Memory usage tracking per request
 */

const os = require('os');
const stream = require('stream');
const { promisify } = require('util');
const { logger } = require('../middleware/request-logger.middleware');
const config = require('../../config/monitoring.config');

const pipeline = promisify(stream.pipeline);

class RequestQueue {
  constructor(maxSize) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  add(request) {
    if (this.queue.length >= this.maxSize) {
      return false;
    }

    const priority = this.getPriority(request);
    const queueItem = {
      request,
      priority,
      timestamp: Date.now()
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    return true;
  }

  next() {
    if (this.queue.length === 0) return null;
    return this.queue.shift();
  }

  getPriority(req) {
    const path = req.path.toLowerCase();
    const priorities = config.request.queue.priorities;

    if (path.includes('/health')) return priorities.health;
    if (path.includes('/auth') || path.includes('/login')) return priorities.auth;
    if (path.includes('/user')) return priorities.user;
    return priorities.default;
  }

  cleanup() {
    const now = Date.now();
    this.queue = this.queue.filter(item => 
      now - item.timestamp <= config.request.queue.maxWait
    );
  }

  size() {
    return this.queue.length;
  }
}

class MemoryOptimizationMiddleware {
  constructor() {
    this.requestCount = 0;
    this.lastGC = Date.now();
    this.activeRequests = 0;
    this.gcInterval = config.memory.gc.minInterval;
    this.pendingResponses = new WeakMap();
    this.requestQueue = new RequestQueue(config.request.queue.maxSize);
    
    // Periodically process queued requests
    setInterval(() => this.processQueue(), 100);
    // Periodically cleanup old requests
    setInterval(() => this.requestQueue.cleanup(), 1000);
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    while (this.activeRequests < config.request.maxConcurrent && this.requestQueue.size() > 0) {
      const queueItem = this.requestQueue.next();
      if (!queueItem) break;

      const { request } = queueItem;
      if (!request.res.headersSent) {
        await this.processRequest(request.req, request.res, request.next);
      }
    }
  }

  /**
   * Main middleware function
   */
  handle() {
    return async (req, res, next) => {
      // Check if we should queue this request
      if (this.activeRequests >= config.request.maxConcurrent) {
        const queued = this.requestQueue.add({ req, res, next });
        if (!queued) {
          return res.status(503).json({
            error: 'Server is too busy, queue is full',
            retryAfter: Math.ceil(config.request.queue.maxWait / 1000)
          });
        }
        return;
      }

      await this.processRequest(req, res, next);
    };
  }

  /**
   * Process a single request
   */
  async processRequest(req, res, next) {
    const startMemory = process.memoryUsage();
    this.activeRequests++;
    this.requestCount++;

    // Set request timeout
    req.setTimeout(config.request.timeout, () => {
      res.status(408).json({ error: 'Request timeout' });
    });

    // Check memory state and trigger optimization if needed
    await this.checkMemoryState();

    // Wrap response methods to optimize memory usage
    this.wrapResponseMethods(res);

    // Track memory usage after request
    res.on('finish', () => {
      this.activeRequests--;
      const endMemory = process.memoryUsage();
      this.trackMemoryUsage(startMemory, endMemory, req);
    });

    next();
  }

  /**
   * Check memory state and optimize if needed
   */
  async checkMemoryState() {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem()
    };

    const heapUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
    const systemUsageRatio = (systemMemory.total - systemMemory.free) / systemMemory.total;

    // Trigger optimization based on different thresholds
    if (heapUsageRatio > config.memory.gc.heapThreshold || 
        systemUsageRatio > config.memory.gc.heapThreshold) {
      await this.optimizeMemory(heapUsageRatio, systemUsageRatio);
    }
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemory(heapUsageRatio, systemUsageRatio) {
    const now = Date.now();
    
    // Don't trigger GC too frequently
    if (now - this.lastGC < this.gcInterval) {
      return;
    }

    if (global.gc) {
      const beforeGC = process.memoryUsage();
      
      // Force garbage collection
      global.gc();
      
      // If memory usage is still high, try aggressive optimization
      if (heapUsageRatio > config.memory.gc.forceThreshold) {
        // Second pass with forced compaction
        global.gc(true);
      }

      const afterGC = process.memoryUsage();
      const freed = {
        heap: (beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024,
        rss: (beforeGC.rss - afterGC.rss) / 1024 / 1024
      };

      logger.info('Garbage collection completed', {
        freed: {
          heap: freed.heap.toFixed(2) + 'MB',
          rss: freed.rss.toFixed(2) + 'MB'
        },
        current: {
          heapUsed: (afterGC.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
          rss: (afterGC.rss / 1024 / 1024).toFixed(2) + 'MB'
        }
      });

      this.lastGC = now;
    }
  }

  /**
   * Wrap response methods to optimize memory usage
   */
  wrapResponseMethods(res) {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Wrap json method to handle large responses
    res.json = (data) => {
      const dataSize = this.approximateSize(data);
      
      // If data is too large, stream it
      if (dataSize > config.memory.response.streamThreshold) {
        return this.streamLargeResponse(res, data);
      }
      
      // If data size exceeds maximum, return error
      if (dataSize > config.memory.response.maxSize) {
        return res.status(413).json({
          error: 'Response payload too large'
        });
      }
      
      return originalJson(data);
    };

    // Wrap send method to handle large responses
    res.send = (data) => {
      if (typeof data === 'string' && data.length > config.memory.response.streamThreshold) {
        return this.streamLargeResponse(res, data);
      }
      
      return originalSend(data);
    };
  }

  /**
   * Stream large responses
   */
  async streamLargeResponse(res, data) {
    const readable = new stream.Readable({
      read() {
        this.push(typeof data === 'string' ? data : JSON.stringify(data));
        this.push(null);
      },
      // Set high water mark to control memory usage
      highWaterMark: 16384 // 16KB chunks
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      await pipeline(readable, res);
    } catch (err) {
      logger.error('Error streaming response:', err);
      throw err;
    }
  }

  /**
   * Track memory usage for a request
   */
  trackMemoryUsage(startMemory, endMemory, req) {
    const growth = {
      heap: endMemory.heapUsed - startMemory.heapUsed,
      rss: endMemory.rss - startMemory.rss
    };

    // Log high memory usage requests
    if (growth.heap > config.memory.response.streamThreshold) {
      logger.warn('High memory usage detected for request', {
        path: req.path,
        method: req.method,
        growth: {
          heap: Math.round(growth.heap / 1024 / 1024) + 'MB',
          rss: Math.round(growth.rss / 1024 / 1024) + 'MB'
        }
      });
    }
  }

  /**
   * Approximate size of data in memory
   */
  approximateSize(data) {
    if (typeof data === 'string') return data.length;
    if (Buffer.isBuffer(data)) return data.length;
    if (ArrayBuffer.isView(data)) return data.byteLength;
    return Buffer.byteLength(JSON.stringify(data));
  }
}

module.exports = new MemoryOptimizationMiddleware(); 