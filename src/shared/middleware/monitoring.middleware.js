/**
 * Monitoring Middleware
 * 
 * Provides metrics collection and distributed tracing
 */

const prometheus = require('prom-client');
const config = require('../../api-gateway/config');
const { logger } = require('../utils/logger');

// Initialize Prometheus metrics
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Create custom metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeRequests = new prometheus.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  labelNames: ['method', 'route']
});

// Request tracking
const activeRequestsMap = new Map();

/**
 * Generate trace ID
 * @returns {string} Trace ID
 */
function generateTraceId() {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Metrics middleware
 * @returns {Function} Express middleware
 */
function metricsMiddleware() {
  return (req, res, next) => {
    if (!config.monitoring.enabled) {
      return next();
    }

    const start = process.hrtime();
    const route = req.route ? req.route.path : req.path;
    const method = req.method;

    // Track active request
    const requestId = req.headers['x-request-id'] || generateTraceId();
    activeRequestsMap.set(requestId, { method, route });
    activeRequests.inc({ method, route });

    // Add response listener
    res.on('finish', () => {
      const duration = process.hrtime(start);
      const durationInSeconds = duration[0] + duration[1] / 1e9;

      // Record metrics
      httpRequestDurationMicroseconds
        .labels(method, route, res.statusCode.toString())
        .observe(durationInSeconds);

      httpRequestsTotal
        .labels(method, route, res.statusCode.toString())
        .inc();

      // Remove from active requests
      activeRequestsMap.delete(requestId);
      activeRequests.dec({ method, route });

      // Log request details
      logger.debug('Request completed', {
        requestId,
        method,
        route,
        statusCode: res.statusCode,
        duration: durationInSeconds
      });
    });

    next();
  };
}

/**
 * Metrics endpoint handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function metricsHandler(req, res) {
  if (!config.monitoring.enabled || !config.monitoring.metrics.enabled) {
    return res.status(404).json({ error: 'Metrics not enabled' });
  }

  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
}

/**
 * Health check endpoint handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function healthCheckHandler(req, res) {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeRequests: activeRequestsMap.size
  };

  res.json(health);
}

/**
 * Trace middleware
 * @returns {Function} Express middleware
 */
function traceMiddleware() {
  return (req, res, next) => {
    if (!config.monitoring.enabled || !config.monitoring.tracing.enabled) {
      return next();
    }

    // Generate or use existing trace ID
    const traceId = req.headers['x-request-id'] || generateTraceId();
    req.traceId = traceId;

    // Add trace headers
    res.setHeader('X-Request-ID', traceId);

    // Log request start
    logger.debug('Request started', {
      traceId,
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body
    });

    next();
  };
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  healthCheckHandler,
  traceMiddleware
}; 