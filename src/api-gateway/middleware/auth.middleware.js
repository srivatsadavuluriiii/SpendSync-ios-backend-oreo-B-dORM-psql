/**
 * Authentication Middleware
 * 
 * Handles Supabase authentication, role-based access control, and session management
 */

const { createClient } = require('../../lib/supabase/server');
const { updateSession } = require('../../lib/supabase/middleware');

/**
 * Authentication middleware using Supabase Auth
 * Checks for valid Supabase session and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const supabase = createClient(req, res);
    
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No valid session found'
      });
    }

    // Attach user and supabase client to request
    req.user = user;
    req.supabase = supabase;
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if authenticated, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const supabase = createClient(req, res);
    
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (!error && user) {
      req.user = user;
      req.supabase = supabase;
    }
    
    next();
  } catch (error) {
    // Don't fail if authentication fails in optional auth
    console.warn('Optional auth middleware warning:', error.message);
    next();
  }
};

/**
 * Role-based authorization middleware
 * Requires authentication and checks user role/metadata
 */
const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      // First ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User must be logged in'
        });
      }

      // If no roles specified, just check authentication
      if (roles.length === 0) {
        return next();
      }

      // Check if user has required role in user metadata
      const userRole = req.user.user_metadata?.role || req.user.app_metadata?.role || 'user';
      const userRoles = Array.isArray(userRole) ? userRole : [userRole];
      const hasRole = Array.isArray(roles) 
        ? roles.some(role => userRoles.includes(role))
        : userRoles.includes(roles);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Required role: ${Array.isArray(roles) ? roles.join(' or ') : roles}`
        });
      }

      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed',
        message: error.message
      });
    }
  };
};

/**
 * Admin authorization middleware
 * Requires user to have admin role
 */
const requireAdmin = authorize(['admin']);

/**
 * Service-to-service authentication middleware
 * For internal microservice communication
 */
const authenticateService = async (req, res, next) => {
  try {
    const serviceKey = req.headers['x-service-key'];
    const expectedKey = process.env.SERVICE_AUTH_KEY;

    if (!serviceKey || !expectedKey) {
      return res.status(401).json({
        success: false,
        error: 'Service authentication required',
        message: 'Missing service authentication key'
      });
    }

    if (serviceKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid service key',
        message: 'Service authentication failed'
      });
    }

    // Mark request as coming from a service
    req.isServiceRequest = true;
    next();
  } catch (error) {
    console.error('Service authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Service authentication failed',
      message: error.message
    });
  }
};

/**
 * Rate limiting for authentication endpoints
 */
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old attempts
    const windowStart = now - windowMs;
    for (const [key, value] of attempts.entries()) {
      if (value.timestamp < windowStart) {
        attempts.delete(key);
      }
    }

    // Check current attempts
    const userAttempts = attempts.get(identifier) || { count: 0, timestamp: now };
    
    if (userAttempts.count >= maxAttempts && userAttempts.timestamp > windowStart) {
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts',
        message: `Please try again in ${Math.ceil(windowMs / 60000)} minutes`,
        retryAfter: Math.ceil((userAttempts.timestamp + windowMs - now) / 1000)
      });
    }

    // Record this attempt on error
    const originalJson = res.json;
    res.json = function(body) {
      if (!body.success && (res.statusCode === 401 || res.statusCode === 403)) {
        attempts.set(identifier, {
          count: userAttempts.count + 1,
          timestamp: now
        });
      }
      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Session validation middleware
 * Ensures session is valid and user is active
 */
const validateSession = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session',
        message: 'Session validation failed'
      });
    }

    // Check if user account is active (if you have user status field)
    if (req.user.user_metadata?.status && req.user.user_metadata.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account inactive',
        message: 'User account is not active'
      });
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Session validation failed',
      message: error.message
    });
  }
};

/**
 * Supabase session middleware
 * Updates session and attaches user to request
 */
const supabaseSession = updateSession;

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  authenticateService,
  authRateLimit,
  validateSession,
  supabaseSession
}; 