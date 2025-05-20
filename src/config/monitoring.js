/**
 * Monitoring Configuration
 * 
 * This file sets up Prometheus monitoring for the service
 */

const promClient = require('prom-client');
const promMiddleware = require('express-prometheus-middleware');

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add a default label to all metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'spendsync_settlement_',
  labels: { service: 'settlement-service' }
});

// Custom metrics
const settlementCreatedCounter = new promClient.Counter({
  name: 'spendsync_settlement_created_total',
  help: 'Total number of settlements created',
  labelNames: ['status', 'currency']
});

const settlementStatusChangedCounter = new promClient.Counter({
  name: 'spendsync_settlement_status_changed_total',
  help: 'Total number of settlement status changes',
  labelNames: ['from', 'to']
});

const algorithmExecutionHistogram = new promClient.Histogram({
  name: 'spendsync_settlement_algorithm_execution_seconds',
  help: 'Settlement algorithm execution time in seconds',
  labelNames: ['algorithm'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const dbOperationHistogram = new promClient.Histogram({
  name: 'spendsync_settlement_db_operation_seconds',
  help: 'Database operation execution time in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Register custom metrics
register.registerMetric(settlementCreatedCounter);
register.registerMetric(settlementStatusChangedCounter);
register.registerMetric(algorithmExecutionHistogram);
register.registerMetric(dbOperationHistogram);

// Prometheus middleware configuration
const prometheusMiddleware = promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: false, // We're collecting them separately with our own configuration
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 5, 10],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  metricsPrefix: 'spendsync_http_',
  authenticate: process.env.NODE_ENV === 'production' ? true : false, // Optional HTTP basic auth
  credentialsProvider: () => ({ user: process.env.METRICS_USER, password: process.env.METRICS_PASSWORD }),
});

// Database operation timer
const createDbTimer = (operation, collection) => {
  return dbOperationHistogram.startTimer({ operation, collection });
};

// Algorithm execution timer
const createAlgorithmTimer = (algorithm) => {
  return algorithmExecutionHistogram.startTimer({ algorithm });
};

module.exports = {
  register,
  prometheusMiddleware,
  metrics: {
    settlementCreatedCounter,
    settlementStatusChangedCounter,
    algorithmExecutionHistogram,
    dbOperationHistogram
  },
  timers: {
    createDbTimer,
    createAlgorithmTimer
  }
}; 