/**
 * API Key Management Middleware
 * In-memory implementation for API key validation and rate limiting
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');

const KEY_PREFIX = 'apikey:';
const ROTATION_WINDOW = 24 * 60 * 60; // 24 hours in seconds

class ApiKeyManager {
  constructor() {
    this.keys = new Map();
    this.usage = new Map();
    this.cleanupIntervals = new Map();
  }

  /**
   * Validate API key and check rate limits
   * @param {string} apiKey - The API key to validate
   * @returns {Promise<boolean>} Whether the key is valid and within limits
   */
  async validateKey(apiKey) {
    try {
      const keyDetails = await this.getKeyDetails(apiKey);
      if (!keyDetails || !keyDetails.enabled) {
        return false;
      }

      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const usageKey = `${apiKey}:${minute}`;

      // Update and check rate limit
      const currentUsage = (this.usage.get(usageKey) || 0) + 1;
      this.usage.set(usageKey, currentUsage);

      // Set cleanup timeout if not already set
      if (!this.cleanupIntervals.has(usageKey)) {
        const cleanup = setTimeout(() => {
          this.usage.delete(usageKey);
          this.cleanupIntervals.delete(usageKey);
        }, 60000); // Cleanup after 1 minute
        this.cleanupIntervals.set(usageKey, cleanup);
      }

      return currentUsage <= keyDetails.rateLimit;
    } catch (error) {
      logger.error('API key validation error:', error);
      return false;
    }
  }

  /**
   * Get API key details
   * @param {string} apiKey - The API key
   * @returns {Promise<Object>} Key details
   */
  async getKeyDetails(apiKey) {
    return this.keys.get(`${KEY_PREFIX}${apiKey}`);
  }

  /**
   * Create new API key
   * @param {Object} details - API key details
   * @returns {Promise<string>} Generated API key
   */
  async createKey(details) {
    const key = crypto.randomBytes(32).toString('hex');
    const keyData = {
      ...details,
      enabled: true,
      created: Date.now(),
      lastUsed: null
    };

    this.keys.set(`${KEY_PREFIX}${key}`, keyData);
    return key;
  }

  /**
   * Rotate API key
   * @param {string} currentKey - Current API key
   * @returns {Promise<string>} New API key
   */
  async rotateKey(currentKey) {
    const keyDetails = await this.getKeyDetails(currentKey);
    if (!keyDetails) {
      throw new Error('Invalid API key');
    }

    const newKey = crypto.randomBytes(32).toString('hex');
    
    // Set up new key
    this.keys.set(`${KEY_PREFIX}${newKey}`, {
      ...keyDetails,
      rotatedFrom: currentKey,
      rotatedAt: Date.now()
    });

    // Update old key
    this.keys.set(`${KEY_PREFIX}${currentKey}`, {
      ...keyDetails,
      enabled: false,
      rotatedTo: newKey,
      rotatedAt: Date.now()
    });

    // Schedule cleanup of old key
    setTimeout(() => {
      this.keys.delete(`${KEY_PREFIX}${currentKey}`);
    }, ROTATION_WINDOW * 1000);

    return newKey;
  }

  /**
   * Disable API key
   * @param {string} key - API key to disable
   * @returns {Promise<boolean>} Success status
   */
  async disableKey(key) {
    const keyDetails = await this.getKeyDetails(key);
    if (!keyDetails) {
      return false;
    }

    this.keys.set(`${KEY_PREFIX}${key}`, {
      ...keyDetails,
      enabled: false,
      disabledAt: Date.now()
    });

    return true;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    // Clear all cleanup intervals
    for (const interval of this.cleanupIntervals.values()) {
      clearTimeout(interval);
    }
    this.cleanupIntervals.clear();
    this.usage.clear();
  }
}

// Create singleton instance
const apiKeyManager = new ApiKeyManager();

/**
 * API Key middleware
 */
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      message: 'API key is required'
    });
  }

  try {
    const isValid = await apiKeyManager.validateKey(apiKey);
    if (!isValid) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid API key or rate limit exceeded'
      });
    }

    next();
  } catch (error) {
    logger.error('API key middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  apiKeyAuth,
  apiKeyManager
}; 