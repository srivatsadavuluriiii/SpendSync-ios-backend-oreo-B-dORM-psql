/**
 * API Key Service Configuration
 */
module.exports = {
  // Base configuration
  base: {
    dbName: process.env.API_KEY_DB_NAME || 'spendsync',
    collection: 'apiKeys',
    defaultExpiryDays: 365,
    rotationGracePeriodDays: 7,
    keyPrefix: 'sk_',
    cleanupIntervalHours: 24
  },

  // Development environment
  development: {
    defaultExpiryDays: 30, // Shorter expiry for development
    rotationGracePeriodDays: 1,
    cleanupIntervalHours: 1
  },

  // Test environment
  test: {
    dbName: 'spendsync_test',
    defaultExpiryDays: 1,
    rotationGracePeriodDays: 1,
    cleanupIntervalHours: 1
  },

  // Production environment
  production: {
    defaultExpiryDays: 365,
    rotationGracePeriodDays: 7,
    cleanupIntervalHours: 24,
    keyRequirements: {
      minPermissions: ['read'],
      requireName: true,
      requireMetadata: true
    }
  }
}; 