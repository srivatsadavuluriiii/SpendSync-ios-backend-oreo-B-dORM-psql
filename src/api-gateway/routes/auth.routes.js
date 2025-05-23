/**
 * Authentication Routes
 * 
 * Handle routes for authentication including login, registration,
 * token refresh, and logout.
 */

const express = require('express');
const { asyncHandler } = require('../../shared/middleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', asyncHandler(authController.register));

/**
 * @route POST /api/v1/auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', asyncHandler(authController.login));

/**
 * @route POST /api/v1/auth/refresh-token
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh-token', asyncHandler(authController.refreshToken));

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout a user
 * @access Public
 */
router.post('/logout', asyncHandler(authController.logout));

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', asyncHandler(authController.getCurrentUser));

/**
 * @route POST /api/v1/auth/google
 * @desc Authenticate with Google OAuth
 * @access Public
 */
router.post('/google', asyncHandler(authController.googleAuth));

module.exports = router; 