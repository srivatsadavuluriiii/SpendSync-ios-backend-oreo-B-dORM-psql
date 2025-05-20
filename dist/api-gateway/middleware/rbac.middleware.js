"use strict";var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");var _some = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/some"));var _includes = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/includes")); /**
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
{ path: '/api/v1/users/*', method: 'DELETE', roles: ['admin', 'user'], ownershipRequired: true }];


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

    if (routePattern.test(path) && (route.method === method || route.method === '*')) {var _context;
      // Check if user has any of the required roles
      const hasRequiredRole = (0, _some.default)(_context = route.roles).call(_context, (role) => (0, _includes.default)(userRoles).call(userRoles, role));

      if (!hasRequiredRole) {
        return { hasAccess: false };
      }

      // If ownership is required, return that info
      if (route.ownershipRequired && !(0, _includes.default)(userRoles).call(userRoles, 'admin')) {
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
  return (req, res, next) => {var _context2, _context3, _context4, _context5;
    // If ownership check is not required, skip
    if (!req.requiresOwnership) {
      return next();
    }

    // Admin users can access any resource
    if (req.user.roles && (0, _includes.default)(_context2 = req.user.roles).call(_context2, 'admin')) {
      return next();
    }

    // Extract resource ID from path
    let resourceId = null;

    // Check for different resource types
    if ((0, _includes.default)(_context3 = req.path).call(_context3, '/users/')) {
      resourceId = extractResourceId(req.path, 'users');
      // For user resources, check if the user is accessing their own data
      if (resourceId === req.user.id) {
        return next();
      }
    } else if ((0, _includes.default)(_context4 = req.path).call(_context4, '/groups/')) {
      // Group ownership checks would be implemented here
      // This requires fetching group membership from the user service
      // For simplicity, we'll delegate this to the specific microservice
      return next();
    } else if ((0, _includes.default)(_context5 = req.path).call(_context5, '/expenses/')) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJGb3JiaWRkZW5FcnJvciIsInJlcXVpcmUiLCJwcm90ZWN0ZWRSb3V0ZXMiLCJwYXRoIiwibWV0aG9kIiwicm9sZXMiLCJvd25lcnNoaXBSZXF1aXJlZCIsImNoZWNrUm91dGVBY2Nlc3MiLCJ1c2VyUm9sZXMiLCJyb3V0ZSIsInJvdXRlUGF0dGVybiIsIlJlZ0V4cCIsInJlcGxhY2UiLCJ0ZXN0IiwiX2NvbnRleHQiLCJoYXNSZXF1aXJlZFJvbGUiLCJfc29tZSIsImRlZmF1bHQiLCJjYWxsIiwicm9sZSIsIl9pbmNsdWRlcyIsImhhc0FjY2VzcyIsImNoZWNrUm9sZXMiLCJyZXEiLCJyZXMiLCJuZXh0IiwidXNlciIsInJlcXVpcmVzT3duZXJzaGlwIiwiZXh0cmFjdFJlc291cmNlSWQiLCJyZXNvdXJjZVR5cGUiLCJyZWdleCIsIm1hdGNoIiwiY2hlY2tPd25lcnNoaXAiLCJfY29udGV4dDIiLCJfY29udGV4dDMiLCJfY29udGV4dDQiLCJfY29udGV4dDUiLCJyZXNvdXJjZUlkIiwiaWQiLCJtb2R1bGUiLCJleHBvcnRzIl0sInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwaS1nYXRld2F5L21pZGRsZXdhcmUvcmJhYy5taWRkbGV3YXJlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUm9sZS1CYXNlZCBBY2Nlc3MgQ29udHJvbCBNaWRkbGV3YXJlXG4gKiBcbiAqIEltcGxlbWVudHMgcm9sZS1iYXNlZCBhY2Nlc3MgY29udHJvbCBmb3IgQVBJIHJvdXRlcy5cbiAqL1xuXG5jb25zdCB7IEZvcmJpZGRlbkVycm9yIH0gPSByZXF1aXJlKCcuLi8uLi9zaGFyZWQvZXJyb3JzJyk7XG5cbi8qKlxuICogUm91dGVzIHdpdGggc3BlY2lmaWMgcm9sZSByZXF1aXJlbWVudHNcbiAqIEZvcm1hdDogeyBwYXRoOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCByb2xlczogc3RyaW5nW10gfVxuICovXG5jb25zdCBwcm90ZWN0ZWRSb3V0ZXMgPSBbXG4gIC8vIEFkbWluLW9ubHkgcm91dGVzXG4gIHsgcGF0aDogJy9hcGkvdjEvYWRtaW4vdXNlcnMnLCBtZXRob2Q6ICdHRVQnLCByb2xlczogWydhZG1pbiddIH0sXG4gIHsgcGF0aDogJy9hcGkvdjEvYWRtaW4vc3lzdGVtLXN0YXRzJywgbWV0aG9kOiAnR0VUJywgcm9sZXM6IFsnYWRtaW4nXSB9LFxuICBcbiAgLy8gR3JvdXAgYWRtaW4gcm91dGVzIChib3RoIHJlZ3VsYXIgYWRtaW5zIGFuZCBncm91cCBhZG1pbnMpXG4gIHsgcGF0aDogJy9hcGkvdjEvZ3JvdXBzLyovc2V0dGluZ3MnLCBtZXRob2Q6ICdQVVQnLCByb2xlczogWydhZG1pbicsICdncm91cF9hZG1pbiddIH0sXG4gIHsgcGF0aDogJy9hcGkvdjEvZ3JvdXBzLyovbWVtYmVycycsIG1ldGhvZDogJ0RFTEVURScsIHJvbGVzOiBbJ2FkbWluJywgJ2dyb3VwX2FkbWluJ10gfSxcbiAgXG4gIC8vIFVzZXIgbWFuYWdlbWVudCByb3V0ZXMgKHVzZXJzIGNhbiBvbmx5IGFjY2VzcyB0aGVpciBvd24gZGF0YSlcbiAgeyBwYXRoOiAnL2FwaS92MS91c2Vycy8qJywgbWV0aG9kOiAnUFVUJywgcm9sZXM6IFsnYWRtaW4nLCAndXNlciddLCBvd25lcnNoaXBSZXF1aXJlZDogdHJ1ZSB9LFxuICB7IHBhdGg6ICcvYXBpL3YxL3VzZXJzLyonLCBtZXRob2Q6ICdERUxFVEUnLCByb2xlczogWydhZG1pbicsICd1c2VyJ10sIG93bmVyc2hpcFJlcXVpcmVkOiB0cnVlIH1cbl07XG5cbi8qKlxuICogQ2hlY2sgaWYgYSB1c2VyIGhhcyB0aGUgcmVxdWlyZWQgcm9sZXMgZm9yIGEgcm91dGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gUmVxdWVzdCBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kIC0gSFRUUCBtZXRob2RcbiAqIEBwYXJhbSB7QXJyYXl9IHVzZXJSb2xlcyAtIFVzZXIgcm9sZXNcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGhhc0FjY2VzcyBhbmQgb3duZXJzaGlwUmVxdWlyZWQgZmxhZ3NcbiAqL1xuZnVuY3Rpb24gY2hlY2tSb3V0ZUFjY2VzcyhwYXRoLCBtZXRob2QsIHVzZXJSb2xlcyA9IFtdKSB7XG4gIGZvciAoY29uc3Qgcm91dGUgb2YgcHJvdGVjdGVkUm91dGVzKSB7XG4gICAgLy8gQ2hlY2sgaWYgcm91dGUgcGF0dGVybiBtYXRjaGVzXG4gICAgY29uc3Qgcm91dGVQYXR0ZXJuID0gbmV3IFJlZ0V4cChgXiR7cm91dGUucGF0aC5yZXBsYWNlKC9cXCovZywgJ1teL10rJyl9JGApO1xuICAgIFxuICAgIGlmIChyb3V0ZVBhdHRlcm4udGVzdChwYXRoKSAmJiAocm91dGUubWV0aG9kID09PSBtZXRob2QgfHwgcm91dGUubWV0aG9kID09PSAnKicpKSB7XG4gICAgICAvLyBDaGVjayBpZiB1c2VyIGhhcyBhbnkgb2YgdGhlIHJlcXVpcmVkIHJvbGVzXG4gICAgICBjb25zdCBoYXNSZXF1aXJlZFJvbGUgPSByb3V0ZS5yb2xlcy5zb21lKHJvbGUgPT4gdXNlclJvbGVzLmluY2x1ZGVzKHJvbGUpKTtcbiAgICAgIFxuICAgICAgaWYgKCFoYXNSZXF1aXJlZFJvbGUpIHtcbiAgICAgICAgcmV0dXJuIHsgaGFzQWNjZXNzOiBmYWxzZSB9O1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBJZiBvd25lcnNoaXAgaXMgcmVxdWlyZWQsIHJldHVybiB0aGF0IGluZm9cbiAgICAgIGlmIChyb3V0ZS5vd25lcnNoaXBSZXF1aXJlZCAmJiAhdXNlclJvbGVzLmluY2x1ZGVzKCdhZG1pbicpKSB7XG4gICAgICAgIHJldHVybiB7IGhhc0FjY2VzczogdHJ1ZSwgb3duZXJzaGlwUmVxdWlyZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gVXNlciBoYXMgYWNjZXNzIGFuZCBubyBvd25lcnNoaXAgY2hlY2sgbmVlZGVkXG4gICAgICByZXR1cm4geyBoYXNBY2Nlc3M6IHRydWUsIG93bmVyc2hpcFJlcXVpcmVkOiBmYWxzZSB9O1xuICAgIH1cbiAgfVxuICBcbiAgLy8gSWYgcm91dGUgaXMgbm90IGluIHRoZSBsaXN0IG9mIHByb3RlY3RlZCByb3V0ZXMsIGFsbG93IGFjY2Vzc1xuICByZXR1cm4geyBoYXNBY2Nlc3M6IHRydWUsIG93bmVyc2hpcFJlcXVpcmVkOiBmYWxzZSB9O1xufVxuXG4vKipcbiAqIE1pZGRsZXdhcmUgdG8gY2hlY2sgaWYgdXNlciBoYXMgdGhlIHJlcXVpcmVkIHJvbGVzXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IEV4cHJlc3MgbWlkZGxld2FyZSBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBjaGVja1JvbGVzKCkge1xuICByZXR1cm4gKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgLy8gSWYgdGhlcmUncyBubyB1c2VyIChwdWJsaWMgcm91dGUpLCBhbGxvdyBhY2Nlc3NcbiAgICBpZiAoIXJlcS51c2VyKSB7XG4gICAgICByZXR1cm4gbmV4dCgpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdCB1c2VyUm9sZXMgPSByZXEudXNlci5yb2xlcyB8fCBbJ3VzZXInXTtcbiAgICBjb25zdCB7IGhhc0FjY2Vzcywgb3duZXJzaGlwUmVxdWlyZWQgfSA9IGNoZWNrUm91dGVBY2Nlc3MocmVxLnBhdGgsIHJlcS5tZXRob2QsIHVzZXJSb2xlcyk7XG4gICAgXG4gICAgaWYgKCFoYXNBY2Nlc3MpIHtcbiAgICAgIHJldHVybiBuZXh0KG5ldyBGb3JiaWRkZW5FcnJvcignSW5zdWZmaWNpZW50IHBlcm1pc3Npb25zJykpO1xuICAgIH1cbiAgICBcbiAgICAvLyBJZiBvd25lcnNoaXAgY2hlY2sgaXMgcmVxdWlyZWQsIGFkZCBhIGZsYWcgdG8gdGhlIHJlcXVlc3RcbiAgICBpZiAob3duZXJzaGlwUmVxdWlyZWQpIHtcbiAgICAgIHJlcS5yZXF1aXJlc093bmVyc2hpcCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIG5leHQoKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IHJlc291cmNlIElEIGZyb20gdGhlIFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggLSBVUkwgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlVHlwZSAtIFJlc291cmNlIHR5cGUgKHVzZXJzLCBncm91cHMsIGV4cGVuc2VzKVxuICogQHJldHVybnMge3N0cmluZ3xudWxsfSBSZXNvdXJjZSBJRCBvciBudWxsIGlmIG5vdCBmb3VuZFxuICovXG5mdW5jdGlvbiBleHRyYWN0UmVzb3VyY2VJZChwYXRoLCByZXNvdXJjZVR5cGUpIHtcbiAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGAvYXBpL3YxLyR7cmVzb3VyY2VUeXBlfS8oW14vXSspYCk7XG4gIGNvbnN0IG1hdGNoID0gcGF0aC5tYXRjaChyZWdleCk7XG4gIFxuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IG51bGw7XG59XG5cbi8qKlxuICogTWlkZGxld2FyZSB0byBjaGVjayByZXNvdXJjZSBvd25lcnNoaXBcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gRXhwcmVzcyBtaWRkbGV3YXJlIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT3duZXJzaGlwKCkge1xuICByZXR1cm4gKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgLy8gSWYgb3duZXJzaGlwIGNoZWNrIGlzIG5vdCByZXF1aXJlZCwgc2tpcFxuICAgIGlmICghcmVxLnJlcXVpcmVzT3duZXJzaGlwKSB7XG4gICAgICByZXR1cm4gbmV4dCgpO1xuICAgIH1cbiAgICBcbiAgICAvLyBBZG1pbiB1c2VycyBjYW4gYWNjZXNzIGFueSByZXNvdXJjZVxuICAgIGlmIChyZXEudXNlci5yb2xlcyAmJiByZXEudXNlci5yb2xlcy5pbmNsdWRlcygnYWRtaW4nKSkge1xuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gRXh0cmFjdCByZXNvdXJjZSBJRCBmcm9tIHBhdGhcbiAgICBsZXQgcmVzb3VyY2VJZCA9IG51bGw7XG4gICAgXG4gICAgLy8gQ2hlY2sgZm9yIGRpZmZlcmVudCByZXNvdXJjZSB0eXBlc1xuICAgIGlmIChyZXEucGF0aC5pbmNsdWRlcygnL3VzZXJzLycpKSB7XG4gICAgICByZXNvdXJjZUlkID0gZXh0cmFjdFJlc291cmNlSWQocmVxLnBhdGgsICd1c2VycycpO1xuICAgICAgLy8gRm9yIHVzZXIgcmVzb3VyY2VzLCBjaGVjayBpZiB0aGUgdXNlciBpcyBhY2Nlc3NpbmcgdGhlaXIgb3duIGRhdGFcbiAgICAgIGlmIChyZXNvdXJjZUlkID09PSByZXEudXNlci5pZCkge1xuICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocmVxLnBhdGguaW5jbHVkZXMoJy9ncm91cHMvJykpIHtcbiAgICAgIC8vIEdyb3VwIG93bmVyc2hpcCBjaGVja3Mgd291bGQgYmUgaW1wbGVtZW50ZWQgaGVyZVxuICAgICAgLy8gVGhpcyByZXF1aXJlcyBmZXRjaGluZyBncm91cCBtZW1iZXJzaGlwIGZyb20gdGhlIHVzZXIgc2VydmljZVxuICAgICAgLy8gRm9yIHNpbXBsaWNpdHksIHdlJ2xsIGRlbGVnYXRlIHRoaXMgdG8gdGhlIHNwZWNpZmljIG1pY3Jvc2VydmljZVxuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9IGVsc2UgaWYgKHJlcS5wYXRoLmluY2x1ZGVzKCcvZXhwZW5zZXMvJykpIHtcbiAgICAgIC8vIEV4cGVuc2Ugb3duZXJzaGlwIGNoZWNrcyB3b3VsZCBiZSBpbXBsZW1lbnRlZCBoZXJlXG4gICAgICAvLyBUaGlzIHJlcXVpcmVzIGZldGNoaW5nIGV4cGVuc2UgZGF0YSBmcm9tIHRoZSBleHBlbnNlIHNlcnZpY2VcbiAgICAgIC8vIEZvciBzaW1wbGljaXR5LCB3ZSdsbCBkZWxlZ2F0ZSB0aGlzIHRvIHRoZSBzcGVjaWZpYyBtaWNyb3NlcnZpY2VcbiAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgfVxuICAgIFxuICAgIC8vIElmIHdlIHJlYWNoIGhlcmUsIHRoZSB1c2VyIGRvZXNuJ3Qgb3duIHRoZSByZXNvdXJjZVxuICAgIG5leHQobmV3IEZvcmJpZGRlbkVycm9yKCdZb3UgZG8gbm90IGhhdmUgcGVybWlzc2lvbiB0byBhY2Nlc3MgdGhpcyByZXNvdXJjZScpKTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNoZWNrUm9sZXMsXG4gIGNoZWNrT3duZXJzaGlwLFxuICBjaGVja1JvdXRlQWNjZXNzXG59OyAiXSwibWFwcGluZ3MiOiJ5VEFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLE1BQU0sRUFBRUEsY0FBYyxDQUFDLENBQUMsR0FBR0MsT0FBTyxDQUFDLHFCQUFxQixDQUFDOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU1DLGVBQWUsR0FBRztBQUN0QjtBQUNBLEVBQUVDLElBQUksRUFBRSxxQkFBcUIsRUFBRUMsTUFBTSxFQUFFLEtBQUssRUFBRUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNoRSxFQUFFRixJQUFJLEVBQUUsNEJBQTRCLEVBQUVDLE1BQU0sRUFBRSxLQUFLLEVBQUVDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7O0FBRXZFO0FBQ0EsRUFBRUYsSUFBSSxFQUFFLDJCQUEyQixFQUFFQyxNQUFNLEVBQUUsS0FBSyxFQUFFQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztBQUNyRixFQUFFRixJQUFJLEVBQUUsMEJBQTBCLEVBQUVDLE1BQU0sRUFBRSxRQUFRLEVBQUVDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDOztBQUV2RjtBQUNBLEVBQUVGLElBQUksRUFBRSxpQkFBaUIsRUFBRUMsTUFBTSxFQUFFLEtBQUssRUFBRUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3RixFQUFFSCxJQUFJLEVBQUUsaUJBQWlCLEVBQUVDLE1BQU0sRUFBRSxR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