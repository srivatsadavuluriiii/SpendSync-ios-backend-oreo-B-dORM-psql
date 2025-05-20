/**
 * Middleware Index
 * 
 * Exports all middleware from a single file for easier importing
 */

const { errorHandler, notFoundHandler } = require('./error.middleware');
const { validate } = require('./validation.middleware');
const { authenticate, requireRole, requireOwnership } = require('./auth.middleware');
const { extractUser, requireAuth, requireRole: serviceRequireRole, requireOwnership: serviceRequireOwnership } = require('./service-auth.middleware');
const { asyncHandler } = require('./async.middleware');
const { rateLimit, ipRateLimit, userRateLimit } = require('./rate-limit.middleware');
const { cors, developmentCors, productionCors } = require('./cors.middleware');
const { requestLogger, developmentLogger, productionLogger, logger } = require('./request-logger.middleware');
const { validateContentType, requireJson, requireMultipart, requireFormEncoded } = require('./content-type.middleware');
const { securityHeaders, developmentHeaders, productionHeaders } = require('./security-headers.middleware');
const { apiKey, createApiKey, rotateApiKey, disableApiKey } = require('./api-key.middleware');
const { performanceMonitoring, developmentMonitoring, productionMonitoring } = require('./performance.middleware');

module.exports = {
  // Error handling middleware
  errorHandler,
  notFoundHandler,
  
  // Validation middleware
  validate,
  
  // Authentication middleware for direct JWT verification
  authenticate,
  requireRole,
  requireOwnership,
  
  // Service authentication middleware for API Gateway integration
  extractUser,
  requireAuth,
  serviceRequireRole,
  serviceRequireOwnership,
  
  // Rate limiting middleware
  rateLimit,
  ipRateLimit,
  userRateLimit,
  
  // CORS middleware
  cors,
  developmentCors,
  productionCors,
  
  // Content type validation middleware
  validateContentType,
  requireJson,
  requireMultipart,
  requireFormEncoded,
  
  // Security headers middleware
  securityHeaders,
  developmentHeaders,
  productionHeaders,
  
  // API key middleware
  apiKey,
  createApiKey,
  rotateApiKey,
  disableApiKey,
  
  // Logging middleware
  requestLogger,
  developmentLogger,
  productionLogger,
  logger,
  
  // Performance monitoring middleware
  performanceMonitoring,
  developmentMonitoring,
  productionMonitoring,
  
  // Utility middleware
  asyncHandler
}; 