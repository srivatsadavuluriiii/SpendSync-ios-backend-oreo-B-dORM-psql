"use strict";
/**
 * Settlement Routes
 *
 * Defines API routes for settlement operations
 */
const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlement.controller');
const { authenticate } = require('../../../../shared/middleware');
const { cacheResponse, generateGroupCacheKey, generateSuggestionsCacheKey } = require('../middleware/cache.middleware');
const { versionRoute } = require('../middleware/versioning.middleware');
const { createVersionedMethodHandlers } = require('../utils/version.utils');
// Cache durations (in seconds)
const CACHE_DURATIONS = {
    SUGGESTIONS: 5 * 60, // 5 minutes for settlement suggestions
    GROUP_SETTLEMENTS: 2 * 60, // 2 minutes for group settlements
    SETTLEMENT_DETAILS: 10 * 60, // 10 minutes for individual settlement details
    USER_SETTLEMENTS: 3 * 60, // 3 minutes for user settlements
    ALGORITHM_COMPARISON: 10 * 60 // 10 minutes for algorithm comparisons
};
// Example of a versioned route
// This is just to demonstrate the pattern - only v1 is implemented now
const getSettlementSuggestionsHandlers = createVersionedMethodHandlers('settlement', 'getSettlementSuggestions');
/**
 * @swagger
 * components:
 *   schemas:
 *     Settlement:
 *       type: object
 *       required:
 *         - payerId
 *         - receiverId
 *         - amount
 *         - currency
 *         - groupId
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated ID of the settlement
 *         payerId:
 *           type: string
 *           description: User ID of the person paying
 *         receiverId:
 *           type: string
 *           description: User ID of the person receiving payment
 *         amount:
 *           type: number
 *           description: Amount to be settled
 *         currency:
 *           type: string
 *           description: Currency code (e.g., USD, EUR)
 *         groupId:
 *           type: string
 *           description: Group ID the settlement belongs to
 *         status:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *           default: pending
 *           description: Status of the settlement
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the settlement was completed
 *         notes:
 *           type: string
 *           description: Optional notes about the settlement
 *         createdBy:
 *           type: string
 *           description: User ID of the person who created the settlement
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the settlement was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the settlement was last updated
 */
/**
 * @swagger
 * /api/v1/settlements/suggestions/{groupId}:
 *   get:
 *     summary: Get settlement suggestions for a group
 *     description: Returns optimal settlement suggestions based on the selected algorithm
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *       - in: query
 *         name: algorithm
 *         schema:
 *           type: string
 *           enum: [minCashFlow, greedy, friendOptimized]
 *           default: minCashFlow
 *         description: Algorithm to use for settlement optimization
 *       - in: query
 *         name: includeFriendships
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Whether to include friendship strengths in calculations
 *       - in: query
 *         name: includeExplanation
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Whether to include explanation of the settlement suggestions
 *     responses:
 *       200:
 *         description: Successful response with settlement suggestions
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
 *                     settlements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     visualization:
 *                       type: object
 *                     explanation:
 *                       type: string
 *                     algorithm:
 *                       type: string
 */
router.get('/suggestions/:groupId', authenticate, cacheResponse(CACHE_DURATIONS.SUGGESTIONS, generateSuggestionsCacheKey), versionRoute(getSettlementSuggestionsHandlers));
/**
 * @swagger
 * /api/settlements:
 *   post:
 *     summary: Create a new settlement
 *     description: Creates a new settlement between two users
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payerId
 *               - receiverId
 *               - amount
 *               - groupId
 *             properties:
 *               payerId:
 *                 type: string
 *               receiverId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               groupId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Settlement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
 */
router.post('/', authenticate, settlementController.createSettlement);
/**
 * @swagger
 * /api/settlements/group/{groupId}:
 *   get:
 *     summary: Get all settlements for a group
 *     description: Returns paginated settlements for a specific group
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of settlements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Settlement'
 */
router.get('/group/:groupId', authenticate, cacheResponse(CACHE_DURATIONS.GROUP_SETTLEMENTS, generateGroupCacheKey), settlementController.getGroupSettlements);
/**
 * @swagger
 * /api/settlements/{settlementId}:
 *   get:
 *     summary: Get a settlement by ID
 *     description: Returns detailed information about a specific settlement
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: settlementId
 *         schema:
 *           type: string
 *         required: true
 *         description: Settlement ID
 *     responses:
 *       200:
 *         description: Settlement details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
 */
router.get('/:settlementId', authenticate, cacheResponse(CACHE_DURATIONS.SETTLEMENT_DETAILS), settlementController.getSettlementById);
/**
 * @swagger
 * /api/settlements/{settlementId}/status:
 *   patch:
 *     summary: Update a settlement's status
 *     description: Update the status of a settlement to pending, completed, or cancelled
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: settlementId
 *         schema:
 *           type: string
 *         required: true
 *         description: Settlement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, cancelled]
 *     responses:
 *       200:
 *         description: Settlement status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
 */
router.patch('/:settlementId/status', authenticate, settlementController.updateSettlementStatus);
/**
 * @swagger
 * /api/settlements/user:
 *   get:
 *     summary: Get user settlements
 *     description: Returns settlements where the current user is involved as payer or receiver
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [paid, received, all]
 *           default: all
 *         description: Type of settlements to return
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: List of user settlements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Settlement'
 */
router.get('/user', authenticate, cacheResponse(CACHE_DURATIONS.USER_SETTLEMENTS), settlementController.getUserSettlements);
/**
 * @swagger
 * /api/settlements/compare/{groupId}:
 *   get:
 *     summary: Compare settlement algorithms
 *     description: Compare different settlement optimization algorithms
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Algorithm comparison results
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
 *                     algorithms:
 *                       type: object
 *                     comparison:
 *                       type: object
 *                     visualizations:
 *                       type: object
 */
router.get('/compare/:groupId', authenticate, cacheResponse(CACHE_DURATIONS.ALGORITHM_COMPARISON), settlementController.compareAlgorithms);
/**
 * @swagger
 * /api/v1/settlements/calculation/{groupId}:
 *   get:
 *     summary: Get detailed settlement calculation breakdown
 *     description: Returns a comprehensive explanation and step-by-step breakdown of the settlement calculation process
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *       - in: query
 *         name: algorithm
 *         schema:
 *           type: string
 *           enum: [minCashFlow, greedy, friendPreference]
 *           default: minCashFlow
 *         description: Algorithm to use for settlement optimization
 *     responses:
 *       200:
 *         description: Detailed calculation breakdown
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
 *                     algorithm:
 *                       type: string
 *                     breakdown:
 *                       type: object
 *                     explanation:
 *                       type: object
 *                     settlements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     debtGraph:
 *                       type: object
 *                     stats:
 *                       type: object
 */
router.get('/calculation/:groupId', authenticate, cacheResponse(CACHE_DURATIONS.ALGORITHM_COMPARISON), settlementController.getSettlementCalculationDetails);
module.exports = router;
