/**
 * Audit logging configuration
 */
module.exports = {
  // MongoDB configuration
  mongo: {
    uri: process.env.AUDIT_MONGO_URI || process.env.MONGO_URI,
    dbName: process.env.AUDIT_DB_NAME || 'audit_logs'
  },

  // Email alert configuration
  email: {
    enabled: process.env.AUDIT_EMAIL_ALERTS === 'true',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.AUDIT_EMAIL_FROM || 'alerts@spendsync.com',
    to: process.env.AUDIT_EMAIL_TO?.split(',') || []
  },

  // Slack alert configuration
  slack: {
    enabled: process.env.AUDIT_SLACK_ALERTS === 'true',
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  },

  // Retention configuration
  retention: {
    // How long to keep different types of audit logs (in days)
    default: 90,
    critical: 365,
    security: 365
  },

  // Alert thresholds
  alertThresholds: {
    failedLogins: parseInt(process.env.ALERT_THRESHOLD_FAILED_LOGINS, 10) || 5,
    apiErrors: parseInt(process.env.ALERT_THRESHOLD_API_ERRORS, 10) || 10,
    dataAccess: parseInt(process.env.ALERT_THRESHOLD_DATA_ACCESS, 10) || 3
  },

  // Event types that should always trigger alerts
  criticalEvents: [
    'SECURITY_BREACH',
    'SECURITY_POLICY_VIOLATION',
    'UNAUTHORIZED_ACCESS',
    'DATA_LEAK',
    'SYSTEM_ERROR'
  ],

  // Fields to redact from audit logs
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'apiKey',
    'credit_card',
    'ssn',
    'dob'
  ],

  // Headers to redact from audit logs
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ]
}; 