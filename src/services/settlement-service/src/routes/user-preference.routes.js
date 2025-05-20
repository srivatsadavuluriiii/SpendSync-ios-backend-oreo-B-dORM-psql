/**
 * User Preference Routes
 * 
 * Defines API routes for user preference operations
 */

const express = require('express');
const router = express.Router();
const userPreferenceController = require('../controllers/user-preference.controller');
const { authenticate } = require('../../../../shared/middleware');
const { cacheResponse } = require('../middleware/cache.middleware');

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  PREFERENCES: 5 * 60,  // 5 minutes for user preferences
  NOTIFICATIONS: 5 * 60,  // 5 minutes for notification settings
};

/**
 * @swagger
 * components:
 *   schemas:
 *     UserPreference:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated ID of the user preference
 *         userId:
 *           type: string
 *           description: ID of the user these preferences belong to
 *         defaultCurrency:
 *           type: string
 *           description: Preferred currency code (e.g., USD, EUR)
 *         settlementAlgorithm:
 *           type: string
 *           enum: [minCashFlow, greedy, friendPreference]
 *           description: Preferred settlement algorithm
 *         notifications:
 *           type: object
 *           properties:
 *             email:
 *               type: boolean
 *             push:
 *               type: boolean
 *             reminderFrequency:
 *               type: string
 *               enum: [never, low, medium, high]
 *             settlementCreated:
 *               type: boolean
 *             settlementCompleted:
 *               type: boolean
 *             paymentReceived:
 *               type: boolean
 *             remindersBefore:
 *               type: number
 *         displaySettings:
 *           type: object
 *           properties:
 *             theme:
 *               type: string
 *               enum: [light, dark, system]
 *             dateFormat:
 *               type: string
 *             numberFormat:
 *               type: string
 *         privacySettings:
 *           type: object
 *           properties:
 *             shareSettlementHistory:
 *               type: boolean
 *             showRealName:
 *               type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Get user preferences
 *     description: Returns user preferences for the authenticated user
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserPreference'
 */
router.get(
  '/',
  authenticate,
  cacheResponse(CACHE_DURATIONS.PREFERENCES),
  userPreferenceController.getUserPreferences
);

/**
 * @swagger
 * /api/preferences:
 *   put:
 *     summary: Update user preferences
 *     description: Update preferences for the authenticated user
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               defaultCurrency:
 *                 type: string
 *               settlementAlgorithm:
 *                 type: string
 *                 enum: [minCashFlow, greedy, friendPreference]
 *               notifications:
 *                 type: object
 *               displaySettings:
 *                 type: object
 *               privacySettings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated user preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserPreference'
 */
router.put(
  '/',
  authenticate,
  userPreferenceController.updateUserPreferences
);

/**
 * @swagger
 * /api/preferences/section/{section}:
 *   patch:
 *     summary: Update a specific section of user preferences
 *     description: Update a specific preferences section for the authenticated user
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         schema:
 *           type: string
 *           enum: [notifications, displaySettings, privacySettings]
 *         required: true
 *         description: Section to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated user preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserPreference'
 */
router.patch(
  '/section/:section',
  authenticate,
  userPreferenceController.updatePreferenceSection
);

/**
 * @swagger
 * /api/preferences/reset:
 *   post:
 *     summary: Reset user preferences to defaults
 *     description: Reset all preferences to default values for the authenticated user
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reset user preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/UserPreference'
 */
router.post(
  '/reset',
  authenticate,
  userPreferenceController.resetUserPreferences
);

/**
 * @swagger
 * /api/preferences/notifications:
 *   get:
 *     summary: Get notification settings
 *     description: Returns notification settings for the authenticated user
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: boolean
 *                     push:
 *                       type: boolean
 *                     reminderFrequency:
 *                       type: string
 *                     settlementCreated:
 *                       type: boolean
 *                     settlementCompleted:
 *                       type: boolean
 *                     paymentReceived:
 *                       type: boolean
 *                     remindersBefore:
 *                       type: number
 */
router.get(
  '/notifications',
  authenticate,
  cacheResponse(CACHE_DURATIONS.NOTIFICATIONS),
  userPreferenceController.getNotificationSettings
);

/**
 * @swagger
 * /api/preferences/currency:
 *   post:
 *     summary: Set default currency
 *     description: Set default currency for the authenticated user
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currency
 *             properties:
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g., USD, EUR)
 *     responses:
 *       200:
 *         description: Updated default currency
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/UserPreference'
 */
router.post(
  '/currency',
  authenticate,
  userPreferenceController.setDefaultCurrency
);

/**
 * @swagger
 * /api/preferences/algorithm:
 *   post:
 *     summary: Set preferred settlement algorithm
 *     description: Set preferred settlement algorithm for the authenticated user
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - algorithm
 *             properties:
 *               algorithm:
 *                 type: string
 *                 enum: [minCashFlow, greedy, friendPreference]
 *                 description: Settlement algorithm preference
 *     responses:
 *       200:
 *         description: Updated settlement algorithm preference
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/UserPreference'
 */
router.post(
  '/algorithm',
  authenticate,
  userPreferenceController.setSettlementAlgorithm
);

module.exports = router; 