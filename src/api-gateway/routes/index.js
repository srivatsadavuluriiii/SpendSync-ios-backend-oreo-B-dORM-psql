/**
 * API Gateway Routes
 * 
 * Main router that combines all API routes
 */

const express = require('express');
const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const { forwardRequest } = require('../utils/service-proxy');
const { asyncHandler } = require('../../shared/middleware/async.middleware');

const router = express.Router();

// Health check endpoint for monitoring
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API Gateway is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes (handled directly by the gateway)
router.use('/auth', authRoutes);

// Dashboard/Admin routes
router.use('/dashboard', dashboardRoutes);

// User Service Routes
router.use('/users', asyncHandler(async (req, res) => {
  await forwardRequest(req, res, 'userService', '/api/users' + req.path);
}));

// Group Routes (handled by Expense Service in our mock setup)
router.use('/groups', asyncHandler(async (req, res) => {
  await forwardRequest(req, res, 'expenseService', '/api/groups' + req.path);
}));

// Expense Service Routes
router.use('/expenses', asyncHandler(async (req, res) => {
  await forwardRequest(req, res, 'expenseService', '/api/expenses' + req.path);
}));

// Settlement Service Routes
router.use('/settlements', asyncHandler(async (req, res) => {
  // Handle the specific case for generate endpoint
  if (req.path.startsWith('/generate/')) {
    const groupId = req.path.split('/generate/')[1];
    await forwardRequest(req, res, 'settlementService', `/api/settlements/generate/${groupId}`);
  } 
  // Handle the specific case for payment
  else if (req.path.match(/\/[^/]+\/pay$/)) {
    const settlementId = req.path.split('/')[1];
    await forwardRequest(req, res, 'settlementService', `/api/settlements/${settlementId}/pay`);
  }
  // Handle other settlement routes
  else {
    await forwardRequest(req, res, 'settlementService', '/api/settlements' + req.path);
  }
}));

// Notification Service Routes
router.use('/notifications', asyncHandler(async (req, res) => {
  await forwardRequest(req, res, 'notificationService', '/api/notifications' + req.path);
}));

// Payment Service Routes
router.use('/payments', asyncHandler(async (req, res) => {
  await forwardRequest(req, res, 'paymentService', '/api/payments' + req.path);
}));

// Analytics Service Routes
router.use('/analytics', asyncHandler(async (req, res) => {
  await forwardRequest(req, res, 'analyticsService', '/api/analytics' + req.path);
}));

module.exports = router; 