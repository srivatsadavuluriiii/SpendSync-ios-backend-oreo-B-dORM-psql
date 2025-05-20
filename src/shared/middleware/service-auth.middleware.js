/**
 * Service Authentication Middleware
 * 
 * Middleware for verifying authentication from the API Gateway
 * within microservices. Extracts user information from headers.
 */

const { UnauthorizedError, ForbiddenError } = require('../errors');

/**
 * Middleware to extract user from API Gateway headers
 * @returns {Function} Express middleware function
 */
const extractUser = () => {
  return (req, res, next) => {
    // Check if request was authenticated by the API Gateway
    const isAuthenticated = req.headers['x-authenticated'] === 'true';
    
    if (isAuthenticated) {
      // Extract user information from headers
      const userId = req.headers['x-user-id'];
      const userRoles = req.headers['x-user-roles'] 
        ? JSON.parse(req.headers['x-user-roles']) 
        : ['user'];
      
      // Set user on the request object
      req.user = {
        id: userId,
        roles: userRoles
      };
    }
    
    next();
  };
};

/**
 * Middleware to require authentication
 * @returns {Function} Express middleware function
 */
const requireAuth = () => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    next();
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
    
    const userRoles = req.user.roles || ['user'];
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
    const userRoles = req.user.roles || ['user'];
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
  extractUser,
  requireAuth,
  requireRole,
  requireOwnership
}; 