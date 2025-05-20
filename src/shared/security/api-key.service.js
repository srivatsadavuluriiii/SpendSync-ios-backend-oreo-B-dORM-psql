const crypto = require('crypto');
const { DatabaseError } = require('../errors/base.error');
const logger = require('../utils/logger');

class ApiKeyService {
  constructor(db) {
    this.db = db;
    this.collection = 'apiKeys';
  }

  /**
   * Generate a new API key
   * @param {string} serviceId - Service identifier
   * @param {number} validityDays - Number of days the key is valid
   * @returns {Promise<Object>} Generated API key details
   */
  async generateKey(serviceId, validityDays = 90) {
    try {
      const key = crypto.randomBytes(32).toString('hex');
      const hashedKey = this._hashKey(key);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validityDays);

      const keyDoc = {
        serviceId,
        hashedKey,
        createdAt: new Date(),
        expiresAt,
        isActive: true,
        rotationStatus: 'current'
      };

      await this.db.collection(this.collection).insertOne(keyDoc);

      // Log key generation
      this._auditLog('generate', serviceId);

      return {
        key,
        expiresAt
      };
    } catch (error) {
      throw new DatabaseError('Failed to generate API key', error);
    }
  }

  /**
   * Rotate API key for a service
   * @param {string} serviceId - Service identifier
   * @returns {Promise<Object>} New API key details
   */
  async rotateKey(serviceId) {
    const session = await this.db.startSession();
    try {
      session.startTransaction();

      // Mark current key as pending rotation
      await this.db.collection(this.collection).updateMany(
        { serviceId, isActive: true },
        { $set: { rotationStatus: 'rotating' } },
        { session }
      );

      // Generate new key
      const newKey = await this.generateKey(serviceId);

      // Mark old keys for deprecation
      await this.db.collection(this.collection).updateMany(
        { serviceId, rotationStatus: 'rotating' },
        { 
          $set: { 
            rotationStatus: 'deprecated',
            deprecatedAt: new Date(),
            expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours grace period
          }
        },
        { session }
      );

      await session.commitTransaction();

      // Log key rotation
      this._auditLog('rotate', serviceId);

      return newKey;
    } catch (error) {
      await session.abortTransaction();
      throw new DatabaseError('Failed to rotate API key', error);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Validate an API key
   * @param {string} key - API key to validate
   * @returns {Promise<boolean>} Whether the key is valid
   */
  async validateKey(key) {
    try {
      const hashedKey = this._hashKey(key);
      const keyDoc = await this.db.collection(this.collection).findOne({
        hashedKey,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!keyDoc) {
        return false;
      }

      // Log validation attempt
      this._auditLog('validate', keyDoc.serviceId);

      return true;
    } catch (error) {
      throw new DatabaseError('Failed to validate API key', error);
    }
  }

  /**
   * Revoke an API key
   * @param {string} serviceId - Service identifier
   * @param {string} key - API key to revoke
   */
  async revokeKey(serviceId, key) {
    try {
      const hashedKey = this._hashKey(key);
      await this.db.collection(this.collection).updateOne(
        { serviceId, hashedKey },
        { 
          $set: { 
            isActive: false,
            revokedAt: new Date()
          }
        }
      );

      // Log key revocation
      this._auditLog('revoke', serviceId);
    } catch (error) {
      throw new DatabaseError('Failed to revoke API key', error);
    }
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys() {
    try {
      const result = await this.db.collection(this.collection).deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { 
            revokedAt: { 
              $lt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) // 30 days retention
            }
          }
        ]
      });

      // Log cleanup
      logger.info(`Cleaned up ${result.deletedCount} expired API keys`);
    } catch (error) {
      throw new DatabaseError('Failed to clean up expired keys', error);
    }
  }

  /**
   * Hash an API key
   * @private
   */
  _hashKey(key) {
    return crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');
  }

  /**
   * Log API key operations for audit
   * @private
   */
  _auditLog(action, serviceId) {
    logger.info(`API Key ${action}`, {
      action,
      serviceId,
      timestamp: new Date().toISOString(),
      ip: process.env.POD_IP || 'unknown'
    });
  }
}

module.exports = ApiKeyService; 