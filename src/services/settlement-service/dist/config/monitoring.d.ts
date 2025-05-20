/**
 * Monitoring Configuration
 *
 * This file sets up Prometheus monitoring for the service
 */
import promClient, { Registry } from 'prom-client';
declare const register: Registry;
declare const prometheusMiddleware: any;
declare const metrics: {
    settlementCreatedCounter: promClient.Counter<"currency" | "status">;
    settlementStatusChangedCounter: promClient.Counter<"from" | "to">;
    algorithmExecutionHistogram: promClient.Histogram<"algorithm">;
    dbOperationHistogram: promClient.Histogram<"operation" | "collection">;
    paymentAttemptCounter: promClient.Counter<"currency" | "status" | "payment_method">;
    paymentProcessingHistogram: promClient.Histogram<"status" | "operation">;
    cacheHitCounter: promClient.Counter<"status">;
    cacheSetCounter: promClient.Counter<string>;
    cacheInvalidationCounter: promClient.Counter<"count">;
    cacheErrorCounter: promClient.Counter<string>;
    cacheOperationHistogram: promClient.Histogram<"operation">;
};
declare const timers: {
    createDbTimer: (operation: string, collection: string) => (labels?: Partial<Record<"operation" | "collection", string | number>> | undefined) => number;
    createAlgorithmTimer: (algorithm: string) => (labels?: Partial<Record<"algorithm", string | number>> | undefined) => number;
};
export { register, prometheusMiddleware, metrics, timers };
