/**
 * Authentication Service
 * 
 * Handles JWT token generation, verification and user authentication
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { UnauthorizedError } = require('../errors');

class AuthService {
  /**
   * Create an authentication service
   * @param {Object} options - Configuration options
   * @param {string} options.jwtSecret - Secret for JWT signing/verification
   * @param {number} options.accessTokenExpiry - Access token expiry in seconds
   * @param {number} options.refreshTokenExpiry - Refresh token expiry in seconds
   */
  constructor(options = {}) {
    this.jwtSecret = options.jwtSecret || 'default-secret-key';
    this.accessTokenExpiry = options.accessTokenExpiry || 3600; // 1 hour
    this.refreshTokenExpiry = options.refreshTokenExpiry || 2592000; // 30 days
  }

  /**
   * Generate access token
   * @param {Object} payload - User data to include in token
   * @returns {string} JWT token
   */
  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - User data to include in token
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry
    });
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} Object containing accessToken and refreshToken
   */
  generateTokens(user) {
    // Create payload with only necessary user info
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles || ['user']
    };

    return {
      accessToken: this.generateToken({ ...payload, type: 'access' }),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {UnauthorizedError} If token is invalid or expired
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired', 'ERR_TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid token', 'ERR_INVALID_TOKEN');
    }
  }

  /**
   * Decode JWT token without verification
   * @param {string} token - JWT token to decode
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Mock method to authenticate a user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Object} Authentication result
   */
  authenticate(username, password) {
    // For demo purposes, accept any credentials
    const mockUser = {
      id: 'demo-user-1',
      username,
      email: `${username}@example.com`,
      roles: ['user']
    };

    const accessToken = this.generateToken(mockUser);
    const refreshToken = this.generateRefreshToken({ id: mockUser.id });

    return {
      user: mockUser,
      accessToken,
      refreshToken
    };
  }
}

module.exports = AuthService; 