const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');
const { EventEmitter } = require('events');

class AuditLoggerService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.collection = 'auditLogs';
    this.db = null;
    this.alertThresholds = new Map();
  }

  /**
   * Initialize the audit logger
   * @param {MongoClient} dbClient - MongoDB client
   */
  async initialize(dbClient) {
    try {
      this.db = dbClient.db(this.config.dbName);
      
      // Create indexes
      await this.db.collection(this.collection).createIndexes([
        { key: { timestamp: -1 } },
        { key: { eventType: 1 } },
        { key: { userId: 1 } },
        { key: { resourceType: 1 } },
        { key: { severity: 1 } },
        { key: { 'metadata.ip': 1 } },
        { key: { timestamp: 1 }, expireAfterSeconds: this.config.retentionDays * 24 * 60 * 60 }
      ]);

      logger.info('Audit logger initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize audit logger:', error);
      throw error;
    }
  }

  /**
   * Log an audit event
   * @param {Object} event - Audit event details
   */
  async log(event) {
    try {
      const auditEvent = this._formatEvent(event);
      
      // Store in database
      await this.db.collection(this.collection).insertOne(auditEvent);

      // Check alert thresholds
      await this._checkAlertThresholds(auditEvent);

      // Emit event for real-time processing
      this.emit('auditEvent', auditEvent);

      logger.debug('Audit event logged successfully', { eventId: auditEvent.eventId });
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      throw error;
    }
  }

  /**
   * Set alert threshold for an event type
   * @param {string} eventType - Type of event to monitor
   * @param {Object} threshold - Threshold configuration
   */
  setAlertThreshold(eventType, threshold) {
    this.alertThresholds.set(eventType, {
      ...threshold,
      windowStart: new Date()
    });
  }

  /**
   * Query audit logs
   * @param {Object} query - Query parameters
   * @returns {Promise<Array>} Matching audit logs
   */
  async query(query) {
    try {
      const {
        startDate,
        endDate,
        eventTypes,
        userIds,
        resourceTypes,
        severities,
        page = 1,
        limit = 50
      } = query;

      const filter = {};

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      if (eventTypes?.length) filter.eventType = { $in: eventTypes };
      if (userIds?.length) filter.userId = { $in: userIds };
      if (resourceTypes?.length) filter.resourceType = { $in: resourceTypes };
      if (severities?.length) filter.severity = { $in: severities };

      const cursor = this.db.collection(this.collection)
        .find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return await cursor.toArray();
    } catch (error) {
      logger.error('Failed to query audit logs:', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   * @param {string} eventType - Type of event
   * @param {number} minutes - Time window in minutes
   * @returns {Promise<Object>} Event statistics
   */
  async getEventStats(eventType, minutes = 60) {
    try {
      const startTime = new Date(Date.now() - minutes * 60 * 1000);

      const stats = await this.db.collection(this.collection).aggregate([
        {
          $match: {
            eventType,
            timestamp: { $gte: startTime }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueIPs: { $addToSet: '$metadata.ip' },
            severityCounts: {
              $push: '$severity'
            }
          }
        }
      ]).toArray();

      return stats[0] || { count: 0, uniqueUsers: [], uniqueIPs: [], severityCounts: [] };
    } catch (error) {
      logger.error('Failed to get event statistics:', error);
      throw error;
    }
  }

  /**
   * Format audit event
   * @private
   */
  _formatEvent(event) {
    return {
      eventId: require('crypto').randomBytes(16).toString('hex'),
      timestamp: new Date(),
      service: this.config.serviceName,
      environment: process.env.NODE_ENV,
      ...event,
      metadata: {
        ...event.metadata,
        processId: process.pid,
        nodeVersion: process.version
      }
    };
  }

  /**
   * Check alert thresholds
   * @private
   */
  async _checkAlertThresholds(event) {
    const threshold = this.alertThresholds.get(event.eventType);
    if (!threshold) return;

    const { limit, windowMinutes, severity, windowStart } = threshold;
    const windowEnd = new Date();

    // Reset window if needed
    if ((windowEnd - windowStart) > (windowMinutes * 60 * 1000)) {
      threshold.windowStart = windowEnd;
      threshold.count = 0;
    }

    // Increment count
    threshold.count = (threshold.count || 0) + 1;

    // Check if threshold is exceeded
    if (threshold.count >= limit) {
      const alert = {
        type: 'THRESHOLD_EXCEEDED',
        eventType: event.eventType,
        count: threshold.count,
        windowMinutes,
        severity,
        timestamp: new Date()
      };

      // Emit alert event
      this.emit('alert', alert);

      // Reset counter
      threshold.count = 0;
      threshold.windowStart = new Date();

      // Log alert
      logger.warn('Audit event threshold exceeded', alert);
    }
  }
}

module.exports = AuditLoggerService; 