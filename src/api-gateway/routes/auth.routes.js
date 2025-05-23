/**
 * Authentication Routes
 * 
 * Handle routes for Supabase authentication including login, registration,
 * social auth (Google, GitHub), and session management.
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate, authRateLimit, supabaseSession } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply Supabase session middleware to all auth routes
router.use(supabaseSession);

// Apply rate limiting to auth routes
router.use(authRateLimit());

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or registration failed
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *       400:
 *         description: Logout failed
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: redirectTo
 *         schema:
 *           type: string
 *         description: URL to redirect to after authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 *       400:
 *         description: Google authentication failed
 */
router.get('/google', authController.googleAuth);

/**
 * @swagger
 * /api/v1/auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth authentication
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: redirectTo
 *         schema:
 *           type: string
 *         description: URL to redirect to after authentication
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth
 *       400:
 *         description: GitHub authentication failed
 */
router.get('/github', authController.githubAuth);

/**
 * @swagger
 * /api/v1/auth/callback:
 *   get:
 *     summary: Handle OAuth callback from providers
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from OAuth provider
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error from OAuth provider
 *     responses:
 *       302:
 *         description: Redirect to frontend application
 */
router.get('/callback', authController.authCallback);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh user session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Session refreshed successfully
 *       401:
 *         description: Session refresh failed
 */
router.post('/refresh', authController.refreshSession);

/**
 * @swagger
 * /api/v1/auth/session:
 *   get:
 *     summary: Get current session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       400:
 *         description: Failed to get session
 */
router.get('/session', authController.getSession);

module.exports = router; 