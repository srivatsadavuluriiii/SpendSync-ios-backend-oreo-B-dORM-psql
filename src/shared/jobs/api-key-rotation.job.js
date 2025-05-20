const cron = require('node-cron');
const logger = require('../utils/logger');

class ApiKeyRotationJob {
  constructor(apiKeyService) {
    this.apiKeyService = apiKeyService;
  }

  /**
   * Start the API key rotation job
   * Runs daily at midnight
   */
  start() {
    // Schedule key rotation check - runs at 00:00 every day
    cron.schedule('0 0 * * *', async () => {
      try {
        await this.rotateExpiredKeys();
        await this.cleanupOldKeys();
      } catch (error) {
        logger.error('API key rotation job failed:', error);
      }
    });

    logger.info('API key rotation job scheduled');
  }

  /**
   * Rotate keys that are nearing expiration
   * @private
   */
  async rotateExpiredKeys() {
    try {
      const expiringKeys = await this.apiKeyService.db.collection('apiKeys').find({
        expiresAt: {
          $lt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days before expiration
        },
        isActive: true,
        rotationStatus: 'current'
      }).toArray();

      for (const key of expiringKeys) {
        try {
          await this.apiKeyService.rotateKey(key.serviceId);
          logger.info(`Rotated API key for service: ${key.serviceId}`);
        } catch (error) {
          logger.error(`Failed to rotate API key for service ${key.serviceId}:`, error);
        }
      }

      logger.info(`Completed rotation check for ${expiringKeys.length} keys`);
    } catch (error) {
      logger.error('Failed to check for expiring keys:', error);
      throw error;
    }
  }

  /**
   * Clean up old and revoked keys
   * @private
   */
  async cleanupOldKeys() {
    try {
      await this.apiKeyService.cleanupExpiredKeys();
      logger.info('Completed API key cleanup');
    } catch (error) {
      logger.error('Failed to clean up old keys:', error);
      throw error;
    }
  }
}

module.exports = ApiKeyRotationJob; 