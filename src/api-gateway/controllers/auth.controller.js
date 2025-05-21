/**
 * Authentication Controller
 * 
 * Handles authentication operations like login, register, refresh token
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { authService } = require('../middleware/auth.middleware');
const { makeServiceRequest } = require('../utils/service-proxy');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const register = async (req, res) => {
  try {
    // Forward registration request to user service
    const response = await makeServiceRequest('userService', 'POST', '/api/auth/register', req.body, req.headers);
    
    // If successful, return the response
    res.status(201).json(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const login = async (req, res) => {
  try {
    // Forward login request to user service
    const response = await makeServiceRequest('userService', 'POST', '/api/auth/login', req.body, req.headers);
    
    // If successful, return the response with token
    res.json(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshToken = async (req, res) => {
  const refreshToken = req.body.refreshToken;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }
  
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, `${config.security.jwt.secret}-refresh`);
    
    // Generate new access token
    const accessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, roles: decoded.roles },
      config.security.jwt.secret,
      { expiresIn: config.security.jwt.expiresIn }
    );
    
    res.json({
      success: true,
      accessToken,
      expiresIn: config.security.jwt.expiresIn
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Logout a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentUser = async (req, res) => {
  // User should be attached to req by auth middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  try {
    // Get user details from user service
    const response = await makeServiceRequest(
      'userService', 
      'GET', 
      `/api/users/${req.user.id}`,
      null,
      req.headers
    );
    
    res.json({
      success: true,
      user: response.data
    });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser
}; 