/**
 * API Gateway Middleware Index
 * 
 * Exports all API Gateway specific middleware from a single file
 */

const { authenticate, authService, isPublicRoute } = require('./auth.middleware');
const { checkRoles, checkOwnership, checkRouteAccess } = require('./rbac.middleware');

module.exports = {
  // Authentication middleware
  authenticate,
  authService,
  isPublicRoute,
  
  // Authorization middleware
  checkRoles,
  checkOwnership,
  checkRouteAccess
}; 