/**
 * Performance Monitoring Middleware
 * 
 * Tracks request performance metrics and integrates with the monitoring service
 * for performance analysis and alerting.
 */

const monitoringService = require('../services/monitoring.service');

/**
 * Create performance monitoring middleware
 * @param {Object} options - Performance monitoring options
 * @param {boolean} options.trackMemory - Whether to track memory usage
 * @param {boolean} options.trackCPU - Whether to track CPU usage
 * @returns {Function} Express middleware function
 */
const performanceMonitoring = (options = {}) => {
  const {
    trackMemory = true,
    trackCPU = true
  } = options;

  return (req, res, next) => {
    // Record start time
    const startTime = process.hrtime();
    
    // Record start memory if enabled
    const startMemory = trackMemory ? process.memoryUsage() : null;
    
    // Record start CPU if enabled
    const startCPU = trackCPU ? process.cpuUsage() : null;

    // Override res.end to capture metrics when the response is sent
    const originalEnd = res.end;
    res.end = function(...args) {
      // Calculate response time
      const diff = process.hrtime(startTime);
      const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2); // in milliseconds

      // Calculate memory usage if enabled
      let memoryMetrics = null;
      if (trackMemory) {
        const endMemory = process.memoryUsage();
        memoryMetrics = {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external,
          rss: endMemory.rss - startMemory.rss
        };
      }

      // Calculate CPU usage if enabled
      let cpuMetrics = null;
      if (trackCPU) {
        const endCPU = process.cpuUsage(startCPU);
        cpuMetrics = {
          user: endCPU.user,
          system: endCPU.system
        };
      }

      // Track request in monitoring service
      monitoringService.trackRequest(req, res, parseFloat(duration), {
        memory: memoryMetrics,
        cpu: cpuMetrics
      });

      // Add performance headers
      res.setHeader('X-Response-Time', `${duration}ms`);
      if (memoryMetrics) {
        res.setHeader('X-Memory-Usage', `${Math.round(memoryMetrics.heapUsed / 1024 / 1024)}MB`);
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};

/**
 * Create development performance monitoring
 * More detailed tracking for development
 */
const developmentMonitoring = () => {
  return performanceMonitoring({
    trackMemory: true,
    trackCPU: true
  });
};

/**
 * Create production performance monitoring
 * Optimized tracking for production
 */
const productionMonitoring = () => {
  return performanceMonitoring({
    trackMemory: true,
    trackCPU: false // CPU tracking can be expensive in production
  });
};

module.exports = {
  performanceMonitoring,
  developmentMonitoring,
  productionMonitoring
}; 