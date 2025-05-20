const cron = require('node-cron');
const logger = require('../utils/logger');

class ApiKeyCleanupJob {
  constructor(apiKeyService, config) {
    this.apiKeyService = apiKeyService;
    this.config = config;
    this.job = null;
  }

  /**
   * Start the cleanup job
   */
  start() {
    // Convert hours to cron expression (run every N hours)
    const cronExpression = `0 */${this.config.cleanupIntervalHours} * * *`;

    this.job = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting API key cleanup job');
        await this.apiKeyService.cleanupKeys();
        logger.info('API key cleanup job completed successfully');
      } catch (error) {
        logger.error('API key cleanup job failed:', error);
      }
    });

    logger.info(`API key cleanup job scheduled to run every ${this.config.cleanupIntervalHours} hours`);
  }

  /**
   * Stop the cleanup job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      logger.info('API key cleanup job stopped');
    }
  }
}

module.exports = ApiKeyCleanupJob; 