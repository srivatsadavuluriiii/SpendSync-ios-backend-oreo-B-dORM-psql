const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class AuditAlertService {
  constructor(config) {
    this.config = config;
    this.emailTransporter = nodemailer.createTransport(config.email);
    this.slackWebhookUrl = config.slack?.webhookUrl;
    this.alertThresholds = {
      failedLogins: 5,
      apiErrors: 10,
      dataAccess: 3
    };
    this.alertCounts = new Map();
  }

  /**
   * Initialize alert handlers
   * @param {AuditLoggerService} auditLogger - Audit logger instance
   */
  initialize(auditLogger) {
    // Subscribe to all audit events
    auditLogger.subscribe(this._handleAuditEvent.bind(this));

    // Subscribe to critical events
    auditLogger.eventEmitter.on('audit:critical', this._handleCriticalEvent.bind(this));

    // Reset alert counts periodically
    setInterval(() => this.alertCounts.clear(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Handle audit events
   * @private
   */
  async _handleAuditEvent(event) {
    try {
      // Check for alert conditions
      if (event.status === 'failure') {
        await this._checkAlertThresholds(event);
      }

      // Special handling for security events
      if (event.eventType.startsWith('SECURITY_')) {
        await this._handleSecurityEvent(event);
      }
    } catch (error) {
      logger.error('Failed to handle audit event for alerts:', error);
    }
  }

  /**
   * Handle critical events
   * @private
   */
  async _handleCriticalEvent(event) {
    try {
      // Send immediate alerts for critical events
      await Promise.all([
        this._sendEmailAlert(event),
        this._sendSlackAlert(event)
      ]);

      // Log alert
      logger.warn('Critical event alert sent:', {
        eventType: event.eventType,
        description: event.description
      });
    } catch (error) {
      logger.error('Failed to handle critical event:', error);
    }
  }

  /**
   * Check alert thresholds
   * @private
   */
  async _checkAlertThresholds(event) {
    const key = this._getAlertKey(event);
    const currentCount = (this.alertCounts.get(key) || 0) + 1;
    this.alertCounts.set(key, currentCount);

    const threshold = this._getThreshold(event);
    if (currentCount >= threshold) {
      // Create threshold alert
      const alertEvent = {
        ...event,
        severity: 'CRITICAL',
        description: `Alert threshold reached: ${currentCount} ${event.eventType} events`,
        metadata: {
          ...event.metadata,
          threshold,
          count: currentCount
        }
      };

      await this._handleCriticalEvent(alertEvent);
      this.alertCounts.delete(key); // Reset count after alert
    }
  }

  /**
   * Handle security events
   * @private
   */
  async _handleSecurityEvent(event) {
    // Always alert on certain security events
    if ([
      'SECURITY_BREACH',
      'SECURITY_POLICY_VIOLATION',
      'UNAUTHORIZED_ACCESS'
    ].includes(event.eventType)) {
      await this._handleCriticalEvent({
        ...event,
        severity: 'CRITICAL'
      });
    }
  }

  /**
   * Send email alert
   * @private
   */
  async _sendEmailAlert(event) {
    if (!this.config.email?.enabled) return;

    const emailContent = this._formatEmailAlert(event);
    
    try {
      await this.emailTransporter.sendMail({
        from: this.config.email.from,
        to: this.config.email.to,
        subject: `[ALERT] ${event.eventType}`,
        html: emailContent
      });
    } catch (error) {
      logger.error('Failed to send email alert:', error);
    }
  }

  /**
   * Send Slack alert
   * @private
   */
  async _sendSlackAlert(event) {
    if (!this.slackWebhookUrl) return;

    const slackMessage = this._formatSlackAlert(event);

    try {
      await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });
    } catch (error) {
      logger.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Format email alert
   * @private
   */
  _formatEmailAlert(event) {
    return `
      <h2>Critical Event Alert</h2>
      <p><strong>Event Type:</strong> ${event.eventType}</p>
      <p><strong>Description:</strong> ${event.description}</p>
      <p><strong>Service:</strong> ${event.serviceId}</p>
      <p><strong>Timestamp:</strong> ${event.timestamp}</p>
      <h3>Details:</h3>
      <pre>${JSON.stringify(event.metadata, null, 2)}</pre>
    `;
  }

  /**
   * Format Slack alert
   * @private
   */
  _formatSlackAlert(event) {
    return {
      text: `🚨 *Critical Event Alert*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Event Type:* ${event.eventType}\n*Description:* ${event.description}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Service:*\n${event.serviceId}`
            },
            {
              type: 'mrkdwn',
              text: `*Timestamp:*\n${event.timestamp}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n\`\`\`${JSON.stringify(event.metadata, null, 2)}\`\`\``
          }
        }
      ]
    };
  }

  /**
   * Get alert key
   * @private
   */
  _getAlertKey(event) {
    return `${event.eventType}:${event.serviceId}`;
  }

  /**
   * Get threshold for event type
   * @private
   */
  _getThreshold(event) {
    if (event.eventType === 'AUTH_FAILED') return this.alertThresholds.failedLogins;
    if (event.eventType === 'API_ERROR') return this.alertThresholds.apiErrors;
    if (event.eventType === 'DATA_ACCESS') return this.alertThresholds.dataAccess;
    return Infinity;
  }
}

module.exports = AuditAlertService; 