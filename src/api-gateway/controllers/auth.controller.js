/**
 * Authentication Controller
 * 
 * Handles authentication operations like login, register, refresh token
 */

const { authService } = require('../middleware/auth.middleware');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const register = async (req, res) => {
  // For demo purposes, return a mock successful registration
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: {
      id: 'new-user-id',
      username: req.body.username || 'demo-user',
      email: req.body.email || 'demo@example.com'
    }
  });
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const login = async (req, res) => {
  const { username, password } = req.body;
  
  // Use the auth service to authenticate the user
  const authResult = authService.authenticate(username || 'demo', password || 'password');
  
  res.json({
    success: true,
    message: 'Login successful',
    accessToken: authResult.accessToken,
    refreshToken: authResult.refreshToken,
    user: authResult.user
  });
};

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshToken = async (req, res) => {
  // For demo purposes, generate a new token
  const mockUser = {
    id: 'demo-user-1',
    username: 'demo',
    email: 'demo@example.com',
    roles: ['user']
  };
  
  const accessToken = authService.generateToken(mockUser);
  
  res.json({
    success: true,
    accessToken
  });
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
  // User is already attached to req by auth middleware
  res.json({
    success: true,
    user: req.user
  });
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser
}; 