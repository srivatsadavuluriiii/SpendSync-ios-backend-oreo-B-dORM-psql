/**
 * Request Throttling Middleware
 * 
 * Implements advanced request throttling with:
 * - Per-endpoint rate limiting
 * - Burst handling
 * - Client tracking
 * - Memory usage monitoring
 */

const LRU = require('lru-cache');
const config = require('../../config/monitoring.config');
const { logger } = require('./request-logger.middleware');

class RequestThrottlingMiddleware {
  constructor() {
    // Store client request counts
    this.clientRequests = new LRU({
      maxEntrySize: 1,
      maxSize: 10000,
      ttl: 60000, // 1 minute
      updateAgeOnGet: true
    });

    // Store client memory usage
    this.clientMemory = new LRU({
      maxEntrySize: 1,
      maxSize: 10000,
      ttl: 300000, // 5 minutes
      updateAgeOnGet: true
    });

    // Store rate limit info per endpoint type
    this.rateLimits = new Map();
    Object.entries(config.request.throttling.limits).forEach(([key, limit]) => {
      this.rateLimits.set(key, new LRU({
        maxEntrySize: 1,
        maxSize: 10000,
        ttl: limit.windowMs,
        updateAgeOnGet: false
      }));
    });

    // Store burst tokens
    this.burstTokens = new LRU({
      maxEntrySize: 1,
      maxSize: 10000,
      ttl: config.request.throttling.burst.burstTTL,
      updateAgeOnGet: false
    });

    // Log initialization
    logger.info('Request throttling initialized', {
      maxConcurrent: config.request.maxConcurrent,
      queueSize: config.request.queue.maxSize,
      limits: config.request.throttling.limits
    });
  }

  /**
   * Get endpoint type from request path
   */
  getEndpointType(path) {
    path = path.toLowerCase();
    if (path.includes('/auth')) return 'auth';
    if (path.includes('/user')) return 'user';
    if (path.includes('/expenses')) return 'expenses';
    if (path.includes('/settlements')) return 'settlements';
    return 'default';
  }

  /**
   * Check if request should be throttled
   */
  shouldThrottle(req) {
    const clientId = req.ip;
    const endpointType = this.getEndpointType(req.path);
    const limit = config.request.throttling.limits[endpointType];

    // Check rate limit
    const rateLimit = this.rateLimits.get(endpointType);
    const currentRequests = rateLimit.get(clientId) || 0;
    
    if (currentRequests >= limit.max) {
      // Check for burst availability
      if (config.request.throttling.burst.enabled) {
        const burstTokens = this.burstTokens.get(clientId) || config.request.throttling.burst.maxBurst;
        if (burstTokens > 0) {
          this.burstTokens.set(clientId, burstTokens - 1);
          return false;
        }
      }
      return true;
    }

    rateLimit.set(clientId, currentRequests + 1);
    return false;
  }

  /**
   * Track client memory usage
   */
  trackClientMemory(req, bytes) {
    if (!config.request.client.trackMemoryUsage) return;

    const clientId = req.ip;
    const currentUsage = this.clientMemory.get(clientId) || 0;
    const newUsage = currentUsage + bytes;

    if (newUsage > config.request.client.maxMemoryPerClient) {
      logger.warn('Client exceeded memory limit', {
        clientId,
        usage: newUsage,
        limit: config.request.client.maxMemoryPerClient
      });
      return false;
    }

    this.clientMemory.set(clientId, newUsage);
    return true;
  }

  /**
   * Track client requests
   */
  trackClientRequests(req) {
    const clientId = req.ip;
    const currentRequests = this.clientRequests.get(clientId) || 0;

    if (currentRequests >= config.request.client.maxRequestsPerClient) {
      return false;
    }

    this.clientRequests.set(clientId, currentRequests + 1);
    return true;
  }

  /**
   * Main middleware function
   */
  handle() {
    return async (req, res, next) => {
      // Skip throttling for health checks
      if (req.path === '/health') {
        return next();
      }

      // Check client request limit
      if (!this.trackClientRequests(req)) {
        return res.status(429).json({
          error: 'Too many concurrent requests from this client',
          retryAfter: Math.ceil(config.request.throttling.windowMs / 1000)
        });
      }

      // Check rate limit
      if (this.shouldThrottle(req)) {
        const endpointType = this.getEndpointType(req.path);
        const limit = config.request.throttling.limits[endpointType];
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(limit.windowMs / 1000)
        });
      }

      // Track request body size
      const contentLength = parseInt(req.get('content-length') || '0', 10);
      if (!this.trackClientMemory(req, contentLength)) {
        return res.status(413).json({
          error: 'Client memory quota exceeded'
        });
      }

      // Track response size
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        const responseSize = Buffer.byteLength(JSON.stringify(data));
        if (!this.trackClientMemory(req, responseSize)) {
          return res.status(413).json({
            error: 'Response would exceed client memory quota'
          });
        }
        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Get throttling statistics
   */
  getStats() {
    return {
      activeClients: this.clientRequests.size,
      totalMemoryUsage: Array.from(this.clientMemory.values()).reduce((a, b) => a + b, 0),
      rateLimits: Object.fromEntries(
        Array.from(this.rateLimits.entries()).map(([key, cache]) => [key, cache.size])
      ),
      burstTokensAvailable: this.burstTokens.size
    };
  }
}

module.exports = new RequestThrottlingMiddleware(); 