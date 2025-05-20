/**
 * Monitoring Service
 * 
 * Provides centralized monitoring, metrics collection, and alerting
 * for application performance and health tracking.
 */

const os = require('os');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { logger } = require('../middleware/request-logger.middleware');
const config = require('../../config/monitoring.config');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: new Map(),
      errors: new Map(),
      performance: new Map()
    };

    // Track heap snapshots
    this.heapSnapshots = [];
    this.lastHeapUsage = process.memoryUsage();
    
    // Initialize email transport if enabled
    if (config.alerts.email.enabled) {
      this.emailTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    // Start metrics collection
    if (config.metrics.systemMetrics) {
      this.startSystemMetricsCollection();
    }

    // Initialize in-memory storage for metrics
    this.metricsStorage = new Map();
    this.errorCounts = new Map();

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Start collecting system metrics
   * @private
   */
  startSystemMetricsCollection() {
    setInterval(() => {
      const metrics = this.collectSystemMetrics();
      this.checkThresholds(metrics);
      this.storeMetrics('system', metrics);
    }, config.metrics.interval);
  }

  /**
   * Collect system metrics
   * @private
   * @returns {Object} System metrics
   */
  collectSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = usedMem / totalMem;

    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;

    return {
      timestamp: Date.now(),
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: memoryUsage
      },
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length
      },
      uptime: os.uptime()
    };
  }

  /**
   * Track request metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} duration - Request duration in milliseconds
   */
  trackRequest(req, res, duration) {
    const metrics = {
      timestamp: Date.now(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    // Store request metrics
    this.storeMetrics('request', metrics);

    // Check response time threshold
    if (duration > config.performance.responseTime.warning) {
      this.handleSlowResponse(metrics);
    }

    // Track error rates
    if (res.statusCode >= 400) {
      this.trackError(res.statusCode, req.path);
    }
  }

  /**
   * Track error occurrence
   * @param {number} statusCode - HTTP status code
   * @param {string} path - Request path
   */
  trackError(statusCode, path) {
    const minute = Math.floor(Date.now() / 60000);
    const key = `errors:${minute}`;
    
    if (!this.errorCounts.has(key)) {
      this.errorCounts.set(key, new Map());
      // Cleanup old entries after 1 hour
      setTimeout(() => this.errorCounts.delete(key), 3600000);
    }

    const errors = this.errorCounts.get(key);
    errors.set(statusCode, (errors.get(statusCode) || 0) + 1);

    // Check error thresholds
    this.checkErrorThresholds(statusCode, path);
  }

  /**
   * Store metrics in memory
   * @private
   * @param {string} type - Metric type
   * @param {Object} metrics - Metric data
   */
  storeMetrics(type, metrics) {
    const minute = Math.floor(Date.now() / 60000);
    const key = `metrics:${type}:${minute}`;
    
    if (!this.metricsStorage.has(key)) {
      this.metricsStorage.set(key, []);
      // Cleanup old entries after 24 hours
      setTimeout(() => this.metricsStorage.delete(key), 86400000);
    }

    this.metricsStorage.get(key).push(metrics);
  }

  /**
   * Check system metric thresholds
   * @private
   * @param {Object} metrics - System metrics
   */
  checkThresholds(metrics) {
    // Check memory usage
    if (metrics.memory.usage > config.performance.memoryUsage.critical) {
      this.sendAlert('critical', 'Memory usage critical', metrics.memory);
    } else if (metrics.memory.usage > config.performance.memoryUsage.warning) {
      this.sendAlert('warning', 'Memory usage high', metrics.memory);
    }

    // Check CPU usage
    if (metrics.cpu.usage > config.performance.cpuUsage.critical) {
      this.sendAlert('critical', 'CPU usage critical', metrics.cpu);
    } else if (metrics.cpu.usage > config.performance.cpuUsage.warning) {
      this.sendAlert('warning', 'CPU usage high', metrics.cpu);
    }
  }

  /**
   * Check error rate thresholds
   * @private
   * @param {number} statusCode - HTTP status code
   * @param {string} path - Request path
   */
  checkErrorThresholds(statusCode, path) {
    const minute = Math.floor(Date.now() / 60000);
    const key = `errors:${minute}`;
    
    const errors = this.errorCounts.get(key) || new Map();
    const totalErrors = Array.from(errors.values())
      .reduce((sum, count) => sum + count, 0);

    // Check total error rate
    if (totalErrors > config.errors.errorRate.critical) {
      this.sendAlert('critical', 'Error rate critical', { totalErrors, path });
    } else if (totalErrors > config.errors.errorRate.warning) {
      this.sendAlert('warning', 'Error rate high', { totalErrors, path });
    }

    // Check specific error types
    if (statusCode >= 500) {
      const serverErrors = errors.get(500) || 0;
      if (serverErrors > config.errors.serverErrorRate.critical) {
        this.sendAlert('critical', 'Server error rate critical', { serverErrors, path });
      }
    }
  }

  /**
   * Handle slow response detection
   * @private
   * @param {Object} metrics - Request metrics
   */
  handleSlowResponse(metrics) {
    logger.warn('Slow response detected', {
      path: metrics.path,
      duration: metrics.duration,
      threshold: config.performance.responseTime.warning
    });

    if (metrics.duration > config.performance.responseTime.critical) {
      this.sendAlert('critical', 'Critical response time', metrics);
    } else {
      this.sendAlert('warning', 'Slow response time', metrics);
    }
  }

  /**
   * Send alert through configured channels
   * @private
   * @param {string} level - Alert level (warning, critical)
   * @param {string} message - Alert message
   * @param {Object} data - Alert data
   */
  async sendAlert(level, message, data) {
    const alert = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    logger.warn('Alert triggered', alert);

    // Send email alert if configured
    if (config.alerts.email.enabled) {
      await this.sendEmailAlert(alert);
    }

    // Send Slack alert if configured
    if (config.alerts.slack.enabled) {
      await this.sendSlackAlert(alert);
    }
  }

  /**
   * Send email alert
   * @private
   * @param {Object} alert - Alert data
   */
  async sendEmailAlert(alert) {
    try {
      await this.emailTransport.sendMail({
        from: config.alerts.email.from,
        to: config.alerts.email.to,
        subject: `[${alert.level.toUpperCase()}] ${alert.message}`,
        text: JSON.stringify(alert, null, 2)
      });
    } catch (error) {
      logger.error('Failed to send email alert', { error });
    }
  }

  /**
   * Send Slack alert
   * @private
   * @param {Object} alert - Alert data
   */
  async sendSlackAlert(alert) {
    try {
      await axios.post(config.alerts.slack.webhookUrl, {
        text: `[${alert.level.toUpperCase()}] ${alert.message}`,
        attachments: [{
          color: alert.level === 'critical' ? 'danger' : 'warning',
          fields: Object.entries(alert.data).map(([key, value]) => ({
            title: key,
            value: JSON.stringify(value),
            short: true
          }))
        }]
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', { error });
    }
  }

  /**
   * Get metrics for a specific type and time range
   * @param {string} type - Metric type
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {Array} Metrics data
   */
  getMetrics(type, startTime, endTime) {
    const metrics = [];
    const startMinute = Math.floor(startTime / 60000);
    const endMinute = Math.floor(endTime / 60000);

    for (let minute = startMinute; minute <= endMinute; minute++) {
      const key = `metrics:${type}:${minute}`;
      const data = this.metricsStorage.get(key) || [];
      metrics.push(...data.filter(m => m.timestamp >= startTime && m.timestamp <= endTime));
    }

    return metrics;
  }

  /**
   * Start memory monitoring
   * @private
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const currentUsage = process.memoryUsage();
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };

      // Calculate memory growth
      const heapGrowth = {
        heapUsed: currentUsage.heapUsed - this.lastHeapUsage.heapUsed,
        rss: currentUsage.rss - this.lastHeapUsage.rss,
        external: currentUsage.external - this.lastHeapUsage.external
      };

      // Store snapshot
      this.heapSnapshots.push({
        timestamp: new Date(),
        usage: currentUsage,
        system: systemMemory,
        growth: heapGrowth
      });

      // Keep last 60 snapshots (10 minutes of data)
      if (this.heapSnapshots.length > 60) {
        this.heapSnapshots.shift();
      }

      // Check for memory leaks
      if (this.detectMemoryLeak(heapGrowth)) {
        this.handleMemoryLeak(currentUsage, heapGrowth);
      }

      this.lastHeapUsage = currentUsage;
    }, 10000); // Check every 10 seconds
  }

  /**
   * Detect potential memory leaks
   * @private
   */
  detectMemoryLeak(growth) {
    // Consider it a potential leak if heap keeps growing for 5 consecutive checks
    if (this.heapSnapshots.length < 5) return false;

    const recentSnapshots = this.heapSnapshots.slice(-5);
    return recentSnapshots.every((snapshot, index) => {
      if (index === 0) return true;
      return snapshot.growth.heapUsed > recentSnapshots[index - 1].growth.heapUsed;
    });
  }

  /**
   * Handle memory leak detection
   * @private
   */
  async handleMemoryLeak(currentUsage, growth) {
    const alert = {
      level: 'critical',
      message: 'Potential memory leak detected',
      data: {
        currentHeapUsed: Math.round(currentUsage.heapUsed / 1024 / 1024) + 'MB',
        heapGrowth: Math.round(growth.heapUsed / 1024 / 1024) + 'MB',
        rssGrowth: Math.round(growth.rss / 1024 / 1024) + 'MB',
        trend: this.heapSnapshots.slice(-5).map(s => ({
          timestamp: s.timestamp,
          heapUsed: Math.round(s.usage.heapUsed / 1024 / 1024) + 'MB'
        }))
      }
    };

    logger.error('Memory leak detected', alert.data);
    await this.sendAlert(alert.level, alert.message, alert.data);
  }
}

module.exports = new MonitoringService(); 