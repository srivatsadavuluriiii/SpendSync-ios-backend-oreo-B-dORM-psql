/**
 * Monitoring Configuration
 *
 * This file sets up Prometheus monitoring for the service
 */
import promClient from 'prom-client';
// @ts-ignore
import promMiddleware from 'express-prometheus-middleware';
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
    labelNames: ['status', 'currency'],
    registers: [register]
});
const settlementStatusChangedCounter = new promClient.Counter({
    name: 'spendsync_settlement_status_changed_total',
    help: 'Total number of settlement status changes',
    labelNames: ['from', 'to'],
    registers: [register]
});
const algorithmExecutionHistogram = new promClient.Histogram({
    name: 'spendsync_settlement_algorithm_execution_seconds',
    help: 'Settlement algorithm execution time in seconds',
    labelNames: ['algorithm'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [register]
});
const dbOperationHistogram = new promClient.Histogram({
    name: 'spendsync_settlement_db_operation_seconds',
    help: 'Database operation execution time in seconds',
    labelNames: ['operation', 'collection'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
});
// Payment metrics
const paymentAttemptCounter = new promClient.Counter({
    name: 'spendsync_payment_attempt_total',
    help: 'Total number of payment attempts',
    labelNames: ['status', 'currency', 'payment_method'],
    registers: [register]
});
const paymentProcessingHistogram = new promClient.Histogram({
    name: 'spendsync_payment_processing_seconds',
    help: 'Payment processing time in seconds',
    labelNames: ['operation', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [register]
});
// Cache metrics
const cacheHitCounter = new promClient.Counter({
    name: 'spendsync_cache_hit_total',
    help: 'Total number of cache hits and misses',
    labelNames: ['status'],
    registers: [register]
});
const cacheSetCounter = new promClient.Counter({
    name: 'spendsync_cache_set_total',
    help: 'Total number of cache set operations',
    registers: [register]
});
const cacheInvalidationCounter = new promClient.Counter({
    name: 'spendsync_cache_invalidation_total',
    help: 'Total number of cache invalidations',
    labelNames: ['count'],
    registers: [register]
});
const cacheErrorCounter = new promClient.Counter({
    name: 'spendsync_cache_error_total',
    help: 'Total number of cache operation errors',
    registers: [register]
});
const cacheOperationHistogram = new promClient.Histogram({
    name: 'spendsync_cache_operation_seconds',
    help: 'Cache operation execution time in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register]
});
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
// Group metrics for export
const metrics = {
    settlementCreatedCounter,
    settlementStatusChangedCounter,
    algorithmExecutionHistogram,
    dbOperationHistogram,
    paymentAttemptCounter,
    paymentProcessingHistogram,
    cacheHitCounter,
    cacheSetCounter,
    cacheInvalidationCounter,
    cacheErrorCounter,
    cacheOperationHistogram
};
// Group timers for export
const timers = {
    createDbTimer,
    createAlgorithmTimer
};
export { register, prometheusMiddleware, metrics, timers };
