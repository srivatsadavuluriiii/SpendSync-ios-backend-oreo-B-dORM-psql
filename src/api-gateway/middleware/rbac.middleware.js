/**
 * Role-Based Access Control Middleware
 * 
 * Implements role-based access control for API routes.
 */

const { ForbiddenError } = require('../../shared/errors');

/**
 * Routes with specific role requirements
 * Format: { path: string, method: string, roles: string[] }
 */
const protectedRoutes = [
  // Admin-only routes
  { path: '/api/v1/admin/users', method: 'GET', roles: ['admin'] },
  { path: '/api/v1/admin/system-stats', method: 'GET', roles: ['admin'] },
  
  // Group admin routes (both regular admins and group admins)
  { path: '/api/v1/groups/*/settings', method: 'PUT', roles: ['admin', 'group_admin'] },
  { path: '/api/v1/groups/*/members', method: 'DELETE', roles: ['admin', 'group_admin'] },
  
  // User management routes (users can only access their own data)
  { path: '/api/v1/users/*', method: 'PUT', roles: ['admin', 'user'], ownershipRequired: true },
  { path: '/api/v1/users/*', method: 'DELETE', roles: ['admin', 'user'], ownershipRequired: true }
];

/**
 * Check if a user has the required roles for a route
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @param {Array} userRoles - User roles
 * @returns {Object} Object with hasAccess and ownershipRequired flags
 */
function checkRouteAccess(path, method, userRoles = []) {
  for (const route of protectedRoutes) {
    // Check if route pattern matches
    const routePattern = new RegExp(`^${route.path.replace(/\*/g, '[^/]+')}$`);
    
    if (routePattern.test(path) && (route.method === method || route.method === '*')) {
      // Check if user has any of the required roles
      const hasRequiredRole = route.roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return { hasAccess: false };
      }
      
      // If ownership is required, return that info
      if (route.ownershipRequired && !userRoles.includes('admin')) {
        return { hasAccess: true, ownershipRequired: true };
      }
      
      // User has access and no ownership check needed
      return { hasAccess: true, ownershipRequired: false };
    }
  }
  
  // If route is not in the list of protected routes, allow access
  return { hasAccess: true, ownershipRequired: false };
}

/**
 * Middleware to check if user has the required roles
 * @returns {Function} Express middleware function
 */
function checkRoles() {
  return (req, res, next) => {
    // If there's no user (public route), allow access
    if (!req.user) {
      return next();
    }
    
    const userRoles = req.user.roles || ['user'];
    const { hasAccess, ownershipRequired } = checkRouteAccess(req.path, req.method, userRoles);
    
    if (!hasAccess) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    
    // If ownership check is required, add a flag to the request
    if (ownershipRequired) {
      req.requiresOwnership = true;
    }
    
    next();
  };
}

/**
 * Extract resource ID from the URL
 * @param {string} path - URL path
 * @param {string} resourceType - Resource type (users, groups, expenses)
 * @returns {string|null} Resource ID or null if not found
 */
function extractResourceId(path, resourceType) {
  const regex = new RegExp(`/api/v1/${resourceType}/([^/]+)`);
  const match = path.match(regex);
  
  return match ? match[1] : null;
}

/**
 * Middleware to check resource ownership
 * @returns {Function} Express middleware function
 */
function checkOwnership() {
  return (req, res, next) => {
    // If ownership check is not required, skip
    if (!req.requiresOwnership) {
      return next();
    }
    
    // Admin users can access any resource
    if (req.user.roles && req.user.roles.includes('admin')) {
      return next();
    }
    
    // Extract resource ID from path
    let resourceId = null;
    
    // Check for different resource types
    if (req.path.includes('/users/')) {
      resourceId = extractResourceId(req.path, 'users');
      // For user resources, check if the user is accessing their own data
      if (resourceId === req.user.id) {
        return next();
      }
    } else if (req.path.includes('/groups/')) {
      // Group ownership checks would be implemented here
      // This requires fetching group membership from the user service
      // For simplicity, we'll delegate this to the specific microservice
      return next();
    } else if (req.path.includes('/expenses/')) {
      // Expense ownership checks would be implemented here
      // This requires fetching expense data from the expense service
      // For simplicity, we'll delegate this to the specific microservice
      return next();
    }
    
    // If we reach here, the user doesn't own the resource
    next(new ForbiddenError('You do not have permission to access this resource'));
  };
}

module.exports = {
  checkRoles,
  checkOwnership,
  checkRouteAccess
}; 