/**
 * Audit Logger Configuration
 */

const config = {
  // Base configuration
  base: {
    serviceName: process.env.SERVICE_NAME || 'unknown-service',
    dbName: process.env.AUDIT_DB_NAME || 'audit_logs',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
    alertThresholds: {
      'HTTP_REQUEST': {
        limit: 1000,
        windowMinutes: 1,
        severity: 'WARNING'
      },
      'AUTHENTICATION_FAILURE': {
        limit: 5,
        windowMinutes: 5,
        severity: 'WARNING'
      },
      'AUTHORIZATION_FAILURE': {
        limit: 10,
        windowMinutes: 5,
        severity: 'WARNING'
      },
      'API_KEY_FAILURE': {
        limit: 5,
        windowMinutes: 5,
        severity: 'WARNING'
      }
    }
  },

  // Development environment
  development: {
    retentionDays: 30, // Shorter retention for development
    alertThresholds: {
      'HTTP_REQUEST': {
        limit: 100,
        windowMinutes: 1,
        severity: 'INFO'
      }
    }
  },

  // Test environment
  test: {
    retentionDays: 1,
    dbName: 'audit_logs_test'
  },

  // Production environment
  production: {
    alertThresholds: {
      'HTTP_REQUEST': {
        limit: 5000, // Higher threshold for production
        windowMinutes: 1,
        severity: 'WARNING'
      },
      'AUTHENTICATION_FAILURE': {
        limit: 10,
        windowMinutes: 5,
        severity: 'WARNING'
      },
      'AUTHORIZATION_FAILURE': {
        limit: 20,
        windowMinutes: 5,
        severity: 'WARNING'
      },
      'API_KEY_FAILURE': {
        limit: 10,
        windowMinutes: 5,
        severity: 'ERROR'
      },
      'DATA_MODIFICATION': {
        limit: 1000,
        windowMinutes: 5,
        severity: 'INFO'
      },
      'SENSITIVE_DATA_ACCESS': {
        limit: 100,
        windowMinutes: 5,
        severity: 'WARNING'
      }
    }
  }
};

/**
 * Get environment-specific configuration
 * @returns {Object} Configuration object
 */
function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  return {
    ...config.base,
    ...(config[env] || {})
  };
}

module.exports = getConfig(); 