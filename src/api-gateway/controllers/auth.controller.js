/**
 * Authentication Controller
 * 
 * Handles authentication operations like login, register, refresh token
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { authService } = require('../middleware/auth.middleware');
const { makeServiceRequest } = require('../utils/service-proxy');
const { OAuth2Client } = require('google-auth-library');

// Create Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

/**
 * Authenticate with Google
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }
    
    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    // Get or create user based on Google profile
    const response = await makeServiceRequest('userService', 'POST', '/api/auth/google', {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      givenName: payload.given_name,
      familyName: payload.family_name
    }, req.headers);
    
    // Return the user and tokens
    res.json(response.data);
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  googleAuth
}; 