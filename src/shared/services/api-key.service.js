const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

class ApiKeyService {
  constructor(config) {
    this.config = config;
    this.collection = 'apiKeys';
    this.db = null;
  }

  /**
   * Initialize the API key service
   * @param {MongoClient} dbClient - MongoDB client
   */
  async initialize(dbClient) {
    try {
      this.db = dbClient.db(this.config.dbName);
      
      // Create indexes
      await this.db.collection(this.collection).createIndexes([
        { key: { key: 1 }, unique: true },
        { key: { userId: 1 } },
        { key: { expiresAt: 1 } },
        { key: { rotatedAt: 1 } }
      ]);

      logger.info('API key service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize API key service:', error);
      throw error;
    }
  }

  /**
   * Generate a new API key
   * @param {Object} options - Key generation options
   * @returns {Object} Generated key details
   */
  async generateKey(options) {
    const {
      userId,
      name,
      expiresInDays = 365,
      permissions = ['read'],
      metadata = {}
    } = options;

    const key = this._generateSecureKey();
    const hashedKey = this._hashKey(key);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const keyDoc = {
      key: hashedKey,
      userId,
      name,
      permissions,
      metadata,
      status: 'active',
      createdAt: new Date(),
      expiresAt,
      lastUsedAt: null,
      rotatedAt: null,
      rotationGracePeriodDays: 7
    };

    try {
      await this.db.collection(this.collection).insertOne(keyDoc);
      
      // Log key generation
      await this._auditLog('API_KEY_GENERATED', {
        userId,
        keyId: keyDoc._id,
        expiresAt
      });

      // Return unmasked key only during generation
      return {
        ...keyDoc,
        key
      };
    } catch (error) {
      logger.error('Failed to generate API key:', error);
      throw error;
    }
  }

  /**
   * Validate an API key
   * @param {string} key - API key to validate
   * @returns {Object} Key details if valid
   */
  async validateKey(key) {
    const hashedKey = this._hashKey(key);

    try {
      const keyDoc = await this.db.collection(this.collection).findOne({
        key: hashedKey,
        status: { $in: ['active', 'rotating'] },
        expiresAt: { $gt: new Date() }
      });

      if (!keyDoc) {
        return null;
      }

      // Update last used timestamp
      await this.db.collection(this.collection).updateOne(
        { _id: keyDoc._id },
        { $set: { lastUsedAt: new Date() } }
      );

      return keyDoc;
    } catch (error) {
      logger.error('Failed to validate API key:', error);
      throw error;
    }
  }

  /**
   * Rotate an API key
   * @param {string} currentKey - Current API key
   * @returns {Object} New key details
   */
  async rotateKey(currentKey) {
    const hashedKey = this._hashKey(currentKey);

    try {
      const keyDoc = await this.db.collection(this.collection).findOne({
        key: hashedKey,
        status: 'active'
      });

      if (!keyDoc) {
        throw new Error('Invalid or inactive API key');
      }

      const newKey = this._generateSecureKey();
      const newHashedKey = this._hashKey(newKey);
      const rotationGracePeriod = new Date(
        Date.now() + keyDoc.rotationGracePeriodDays * 24 * 60 * 60 * 1000
      );

      // Update existing key
      await this.db.collection(this.collection).updateOne(
        { _id: keyDoc._id },
        {
          $set: {
            key: newHashedKey,
            status: 'rotating',
            rotatedAt: new Date(),
            rotationExpiresAt: rotationGracePeriod,
            previousKey: hashedKey
          }
        }
      );

      // Log key rotation
      await this._auditLog('API_KEY_ROTATED', {
        userId: keyDoc.userId,
        keyId: keyDoc._id,
        rotationExpiresAt: rotationGracePeriod
      });

      return {
        ...keyDoc,
        key: newKey,
        rotationExpiresAt: rotationGracePeriod
      };
    } catch (error) {
      logger.error('Failed to rotate API key:', error);
      throw error;
    }
  }

  /**
   * Revoke an API key
   * @param {string} key - API key to revoke
   * @param {string} reason - Revocation reason
   */
  async revokeKey(key, reason = 'manual_revocation') {
    const hashedKey = this._hashKey(key);

    try {
      const keyDoc = await this.db.collection(this.collection).findOne({
        key: hashedKey
      });

      if (!keyDoc) {
        throw new Error('Invalid API key');
      }

      await this.db.collection(this.collection).updateOne(
        { _id: keyDoc._id },
        {
          $set: {
            status: 'revoked',
            revokedAt: new Date(),
            revocationReason: reason
          }
        }
      );

      // Log key revocation
      await this._auditLog('API_KEY_REVOKED', {
        userId: keyDoc.userId,
        keyId: keyDoc._id,
        reason
      });
    } catch (error) {
      logger.error('Failed to revoke API key:', error);
      throw error;
    }
  }

  /**
   * Clean up expired and rotated keys
   */
  async cleanupKeys() {
    try {
      const now = new Date();

      // Delete expired keys
      await this.db.collection(this.collection).deleteMany({
        expiresAt: { $lt: now }
      });

      // Complete rotation for keys past grace period
      await this.db.collection(this.collection).updateMany(
        {
          status: 'rotating',
          rotationExpiresAt: { $lt: now }
        },
        {
          $set: { status: 'active' },
          $unset: { previousKey: 1, rotationExpiresAt: 1 }
        }
      );

      logger.info('API key cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup API keys:', error);
      throw error;
    }
  }

  /**
   * Generate a secure random API key
   * @private
   */
  _generateSecureKey() {
    const keyBytes = crypto.randomBytes(32);
    return `sk_${keyBytes.toString('base64url')}`;
  }

  /**
   * Hash an API key for storage
   * @private
   */
  _hashKey(key) {
    return crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');
  }

  /**
   * Log an audit event
   * @private
   */
  async _auditLog(eventType, details) {
    // This will be implemented by the audit logging service
    // For now, just log to console
    logger.info(`API Key Audit: ${eventType}`, details);
  }
}

module.exports = ApiKeyService; 