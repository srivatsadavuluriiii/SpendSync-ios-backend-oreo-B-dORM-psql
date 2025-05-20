const express = require('express');
const validate = require('../../../../shared/middleware/validate.middleware');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updatePreferencesSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  getUserSchema,
  listUsersSchema
} = require('../validations/user.validation');
const userController = require('../controllers/user.controller');
const auth = require('../../../../shared/middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/users/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  validate(registerSchema),
  userController.register
);

/**
 * @route   POST /api/users/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  validate(loginSchema),
  userController.login
);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  auth(),
  validate(updateProfileSchema),
  userController.updateProfile
);

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/preferences',
  auth(),
  validate(updatePreferencesSchema),
  userController.updatePreferences
);

/**
 * @route   POST /api/users/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  userController.forgotPassword
);

/**
 * @route   POST /api/users/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  userController.resetPassword
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Private
 */
router.get(
  '/:userId',
  auth(),
  validate(getUserSchema),
  userController.getUserById
);

/**
 * @route   GET /api/users
 * @desc    List users with filters
 * @access  Private
 */
router.get(
  '/',
  auth(),
  validate(listUsersSchema),
  userController.listUsers
);

module.exports = router; 