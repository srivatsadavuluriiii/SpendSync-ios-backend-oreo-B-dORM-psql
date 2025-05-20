import client from 'prom-client';
import { Request, Response } from 'express';
import { logger } from './errors';
import { Cache } from './cache';

// Initialize metrics cache
const metricsCache = new Cache({
  ttl: 60,
  prefix: 'metrics:'
});

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  register,
  prefix: 'analytics_'
});

// Custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const analyticsEventsProcessed = new client.Counter({
  name: 'analytics_events_processed_total',
  help: 'Total number of analytics events processed',
  labelNames: ['type', 'status']
});

const analyticsProcessingDuration = new client.Histogram({
  name: 'analytics_processing_duration_seconds',
  help: 'Duration of analytics processing in seconds',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const queueSize = new client.Gauge({
  name: 'analytics_queue_size',
  help: 'Current size of analytics processing queue',
  labelNames: ['queue_type']
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(analyticsEventsProcessed);
register.registerMetric(analyticsProcessingDuration);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
register.registerMetric(activeConnections);
register.registerMetric(queueSize);

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: Function) => {
  const start = process.hrtime();

  // Track active connections
  activeConnections.inc();

  // Record metrics on response finish
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationSeconds = duration[0] + duration[1] / 1e9;

    // Record HTTP metrics
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(durationSeconds);

    httpRequestsTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .inc();

    // Decrease active connections
    activeConnections.dec();
  });

  next();
};

// Analytics metrics tracking
export const analyticsMetrics = {
  trackEvent: (type: string, duration: number, status: string = 'success') => {
    analyticsEventsProcessed.labels(type, status).inc();
    analyticsProcessingDuration.labels(type).observe(duration);
  },

  setQueueSize: (type: string, size: number) => {
    queueSize.labels(type).set(size);
  },

  trackCache: (type: string, hit: boolean) => {
    if (hit) {
      cacheHits.labels(type).inc();
    } else {
      cacheMisses.labels(type).inc();
    }
  }
};

// Metrics endpoint handler
export const metricsHandler = async (req: Request, res: Response) => {
  try {
    // Try to get metrics from cache
    const cachedMetrics = await metricsCache.get('prometheus');
    
    if (cachedMetrics) {
      res.set('Content-Type', register.contentType);
      return res.send(cachedMetrics);
    }

    // Generate fresh metrics
    const metrics = await register.metrics();
    
    // Cache the metrics
    await metricsCache.set('prometheus', metrics);
    
    res.set('Content-Type', register.contentType);
    res.send(metrics);
  } catch (err) {
    logger.error('Error generating metrics:', err);
    res.status(500).send('Error generating metrics');
  }
};

// Alert thresholds
export const alertThresholds = {
  errorRate: {
    warning: 0.01, // 1% error rate
    critical: 0.05 // 5% error rate
  },
  responseTime: {
    warning: 1000, // 1 second
    critical: 5000 // 5 seconds
  },
  queueSize: {
    warning: 1000,
    critical: 5000
  },
  processingLag: {
    warning: 300, // 5 minutes
    critical: 900 // 15 minutes
  }
};

// Export registry for tests
export const metricRegistry = register; 