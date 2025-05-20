/**
 * Monitoring Configuration Mock
 * 
 * This file provides mock implementations of monitoring functions
 */

// Mock Prometheus Registry
const register = {
  contentType: 'text/plain',
  metrics: async () => 'mock_metric{job="settlement_service"} 1\n'
};

// Mock Prometheus middleware
const prometheusMiddleware = (req, res, next) => {
  // Simply pass through to the next middleware
  next();
};

// Group metrics for export
const metrics = {
  // Mock counter implementations
  settlementCreatedCounter: {
    inc: (labels) => console.log(`Mock metric: settlementCreated ${JSON.stringify(labels)}`)
  },
  settlementStatusChangedCounter: {
    inc: (labels) => console.log(`Mock metric: settlementStatusChanged ${JSON.stringify(labels)}`)
  },
  paymentAttemptCounter: {
    inc: (labels) => console.log(`Mock metric: paymentAttempt ${JSON.stringify(labels)}`)
  },
  cacheHitCounter: {
    inc: (labels) => console.log(`Mock metric: cacheHit ${JSON.stringify(labels)}`)
  },
  cacheSetCounter: {
    inc: () => console.log(`Mock metric: cacheSet`)
  },
  cacheInvalidationCounter: {
    inc: (labels) => console.log(`Mock metric: cacheInvalidation ${JSON.stringify(labels)}`)
  },
  cacheErrorCounter: {
    inc: () => console.log(`Mock metric: cacheError`)
  }
};

// Mock timer implementations
const timers = {
  createDbTimer: (operation, collection) => {
    console.log(`Mock timer started: DB ${operation} on ${collection}`);
    return () => console.log(`Mock timer ended: DB ${operation} on ${collection}`);
  },
  createAlgorithmTimer: (algorithm) => {
    console.log(`Mock timer started: Algorithm ${algorithm}`);
    return () => console.log(`Mock timer ended: Algorithm ${algorithm}`);
  }
};

module.exports = {
  register,
  prometheusMiddleware,
  metrics,
  timers
}; 