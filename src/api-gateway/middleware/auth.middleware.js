/**
 * Authentication Middleware
 * 
 * Handles JWT validation, role-based access control, and refresh token mechanism
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError, ForbiddenError } = require('../../shared/errors');
const AuthService = require('../../shared/services/auth.service');

// Create auth service instance
const authService = new AuthService({
  jwtSecret: config.security.jwt.secret,
  accessTokenExpiry: 24 * 60 * 60, // 24 hours
  refreshTokenExpiry: 7 * 24 * 60 * 60 // 7 days
});

// Token types
const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh'
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @param {string} type - Token type (access or refresh)
 * @returns {Object} Decoded token payload
 */
function verifyToken(token, type = TOKEN_TYPES.ACCESS) {
  try {
    const secret = type === TOKEN_TYPES.ACCESS ? 
      config.security.jwt.secret : 
      `${config.security.jwt.secret}-refresh`;

    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token has expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}

/**
 * Generate new access token
 * @param {Object} payload - Token payload
 * @returns {string} New access token
 */
function generateAccessToken(payload) {
  return jwt.sign(
    { ...payload, type: TOKEN_TYPES.ACCESS },
    config.security.jwt.secret,
    { expiresIn: config.security.jwt.expiresIn }
  );
}

/**
 * Generate new refresh token
 * @param {Object} payload - Token payload
 * @returns {string} New refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    { ...payload, type: TOKEN_TYPES.REFRESH },
    `${config.security.jwt.secret}-refresh`,
    { expiresIn: config.security.jwt.refreshExpiresIn }
  );
}

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {string|null} Extracted token or null
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');
  return type === 'Bearer' ? token : null;
}

/**
 * Check if user has required roles
 * @param {string[]} userRoles - User roles
 * @param {string|string[]} requiredRoles - Required roles
 * @returns {boolean} Whether user has required roles
 */
function hasRequiredRoles(userRoles, requiredRoles) {
  if (!requiredRoles) return true;
  if (!userRoles) return false;

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.some(role => userRoles.includes(role));
}

/**
 * Authentication middleware
 * @param {Object} options - Middleware options
 * @param {boolean} [options.required=true] - Whether authentication is required
 * @param {string|string[]} [options.roles] - Required roles
 * @returns {Function} Express middleware
 */
function authenticate(options = {}) {
  const { required = true, roles } = options;

  return async (req, res, next) => {
    try {
      const token = extractToken(req);

      if (!token) {
        if (required) {
          throw new UnauthorizedError('Authentication required');
        }
        return next();
      }

      // Verify token
      const decoded = verifyToken(token);
      
      // Check roles if required
      if (roles && !hasRequiredRoles(decoded.roles, roles)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      // Attach user to request
      req.user = {
        id: decoded.id || decoded.userId, // Supporting both formats
        email: decoded.email,
        roles: decoded.roles || []
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Refresh token middleware
 * @returns {Function} Express middleware
 */
function refreshToken() {
  return async (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) {
        throw new UnauthorizedError('Refresh token required');
      }

      // Verify refresh token
      const decoded = verifyToken(token, TOKEN_TYPES.REFRESH);
      
      // Check token type
      if (decoded.type !== TOKEN_TYPES.REFRESH) {
        throw new UnauthorizedError('Invalid token type');
      }

      // Generate new tokens
      const accessToken = generateAccessToken({
        id: decoded.id,
        email: decoded.email,
        roles: decoded.roles
      });

      const refreshToken = generateRefreshToken({
        id: decoded.id,
        email: decoded.email,
        roles: decoded.roles
      });

      // Send new tokens
      res.json({
        accessToken,
        refreshToken,
        expiresIn: config.security.jwt.expiresIn
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticate,
  refreshToken,
  generateAccessToken,
  generateRefreshToken,
  TOKEN_TYPES,
  authService // Export auth service instance
}; 