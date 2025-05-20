const express = require('express');
const { body, query } = require('express-validator');
const validateRequest = require('../middleware/validate-request');
const authMiddleware = require('../middleware/auth');

/**
 * Create API key routes
 * @param {ApiKeyService} apiKeyService - API key service instance
 * @returns {Router} Express router
 */
const createApiKeyRoutes = (apiKeyService) => {
  const router = express.Router();

  // Require authentication for all routes
  router.use(authMiddleware);

  /**
   * Generate new API key
   */
  router.post(
    '/',
    [
      body('name').isString().trim().notEmpty(),
      body('expiresInDays').optional().isInt({ min: 1, max: 365 }),
      body('permissions').optional().isArray(),
      body('metadata').optional().isObject(),
      validateRequest
    ],
    async (req, res) => {
      try {
        const keyDetails = await apiKeyService.generateKey({
          userId: req.user.id,
          ...req.body
        });

        res.status(201).json({
          message: 'API key generated successfully',
          data: keyDetails
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to generate API key',
          code: 'API_KEY_GENERATION_ERROR'
        });
      }
    }
  );

  /**
   * List API keys for user
   */
  router.get(
    '/',
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      validateRequest
    ],
    async (req, res) => {
      try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const keys = await apiKeyService.db.collection('apiKeys')
          .find(
            { userId: req.user.id },
            {
              projection: {
                key: 0, // Don't return hashed keys
                _id: 1,
                name: 1,
                status: 1,
                permissions: 1,
                createdAt: 1,
                expiresAt: 1,
                lastUsedAt: 1
              }
            }
          )
          .skip(skip)
          .limit(limit)
          .toArray();

        res.json({
          message: 'API keys retrieved successfully',
          data: keys
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to retrieve API keys',
          code: 'API_KEY_RETRIEVAL_ERROR'
        });
      }
    }
  );

  /**
   * Rotate API key
   */
  router.post(
    '/:id/rotate',
    [
      body('currentKey').isString().notEmpty(),
      validateRequest
    ],
    async (req, res) => {
      try {
        const newKeyDetails = await apiKeyService.rotateKey(req.body.currentKey);

        res.json({
          message: 'API key rotated successfully',
          data: {
            newKey: newKeyDetails.key,
            rotationExpiresAt: newKeyDetails.rotationExpiresAt
          }
        });
      } catch (error) {
        if (error.message === 'Invalid or inactive API key') {
          return res.status(400).json({
            error: error.message,
            code: 'API_KEY_INVALID'
          });
        }

        res.status(500).json({
          error: 'Failed to rotate API key',
          code: 'API_KEY_ROTATION_ERROR'
        });
      }
    }
  );

  /**
   * Revoke API key
   */
  router.post(
    '/:id/revoke',
    [
      body('key').isString().notEmpty(),
      body('reason').optional().isString(),
      validateRequest
    ],
    async (req, res) => {
      try {
        await apiKeyService.revokeKey(req.body.key, req.body.reason);

        res.json({
          message: 'API key revoked successfully'
        });
      } catch (error) {
        if (error.message === 'Invalid API key') {
          return res.status(400).json({
            error: error.message,
            code: 'API_KEY_INVALID'
          });
        }

        res.status(500).json({
          error: 'Failed to revoke API key',
          code: 'API_KEY_REVOCATION_ERROR'
        });
      }
    }
  );

  return router;
};

module.exports = createApiKeyRoutes; 