/**
 * API Gateway Routes
 * 
 * Main router that combines all API routes
 */

const express = require('express');
const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const { forwardRequest } = require('../utils/service-proxy');
const { asyncHandler } = require('../../shared/middleware/error.middleware');

const router = express.Router();

// Authentication routes
router.use('/auth', authRoutes);

// Dashboard/Admin routes
router.use('/dashboard', dashboardRoutes);

// User Service Routes
router.use('/users', asyncHandler(async (req, res, next) => {
  await forwardRequest(req, res, 'userService');
}));

// Expense Service Routes
router.use('/expenses', asyncHandler(async (req, res, next) => {
  await forwardRequest(req, res, 'expenseService');
}));

// Settlement Service Routes
router.use('/settlements', asyncHandler(async (req, res, next) => {
  await forwardRequest(req, res, 'settlementService');
}));

// Group Routes (handled by User Service)
router.use('/groups', asyncHandler(async (req, res, next) => {
  await forwardRequest(req, res, 'userService');
}));

// Notification Routes
router.use('/notifications', asyncHandler(async (req, res, next) => {
  await forwardRequest(req, res, 'notificationService');
}));

// Payment Routes
router.use('/payments', asyncHandler(async (req, res, next) => {
  await forwardRequest(req, res, 'paymentService');
}));

module.exports = router; 