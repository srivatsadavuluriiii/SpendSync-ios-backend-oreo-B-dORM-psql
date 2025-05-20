/**
 * Authentication middleware
 * 
 * Provides middleware for handling authentication and authorization
 * across the application.
 */

const { UnauthorizedError, ForbiddenError } = require('../errors');

/**
 * Middleware to validate JWT authentication
 * @param {Object} authService - Authentication service with verifyToken method
 * @returns {Function} Express middleware function
 */
const authenticate = (authService) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Authentication required'));
      }
      
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return next(new UnauthorizedError('Invalid authentication token'));
      }
      
      // Verify token
      const decoded = await authService.verifyToken(token);
      
      // Set user information on request object
      req.user = decoded;
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token expired', 'ERR_TOKEN_EXPIRED'));
      }
      
      if (error.name === 'JsonWebTokenError') {
        return next(new UnauthorizedError('Invalid token', 'ERR_INVALID_TOKEN'));
      }
      
      next(error);
    }
  };
};

/**
 * Middleware to check if user has required role
 * @param {string|string[]} roles - Required role(s)
 * @returns {Function} Express middleware function
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    const userRoles = req.user.roles || [];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    
    next();
  };
};

/**
 * Middleware to check if user owns a resource or has admin role
 * @param {Function} resourceIdGetter - Function to get resource owner ID from request
 * @returns {Function} Express middleware function
 */
const requireOwnership = (resourceIdGetter) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    // Check if user is admin
    const userRoles = req.user.roles || [];
    if (userRoles.includes('admin')) {
      return next();
    }
    
    try {
      // Get resource owner ID
      const ownerId = await resourceIdGetter(req);
      
      if (ownerId === null) {
        return next(new ForbiddenError('Resource ownership could not be determined'));
      }
      
      // Check if user is the owner
      if (ownerId !== req.user.id) {
        return next(new ForbiddenError('You do not have permission to access this resource'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticate,
  requireRole,
  requireOwnership
}; 