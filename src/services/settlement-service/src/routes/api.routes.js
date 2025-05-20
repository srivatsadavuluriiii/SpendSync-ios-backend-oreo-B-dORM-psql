/**
 * API Routes
 * 
 * Main router that organizes all API routes and handles versioning
 */

const express = require('express');
const router = express.Router();
const { extractVersion } = require('../middleware/versioning.middleware');

// Import route modules
const settlementRoutes = require('./settlement.routes');
const paymentRoutes = require('./payment.routes');
const userPreferenceRoutes = require('./user-preference.routes');
const exportRoutes = require('./export.routes');

// Middleware to extract API version
router.use(extractVersion);

/**
 * API Version 1 Routes
 */

// Standard API routes - prefix with version
router.use('/v1/settlements', settlementRoutes);
router.use('/v1/payments', paymentRoutes);
router.use('/v1/preferences', userPreferenceRoutes);
router.use('/v1/export', exportRoutes);

// Compatibility mode: Map the unversioned routes to v1 for backward compatibility
// This allows existing clients to continue using the API without version prefix
router.use('/settlements', settlementRoutes);
router.use('/payments', paymentRoutes);
router.use('/preferences', userPreferenceRoutes);
router.use('/export', exportRoutes);

/**
 * For future versions, add new versioned routes here:
 * Example:
 * router.use('/v2/settlements', v2SettlementRoutes);
 */

module.exports = router; 