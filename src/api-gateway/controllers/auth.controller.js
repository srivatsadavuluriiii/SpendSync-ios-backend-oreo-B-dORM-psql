/**
 * Authentication Controller
 * 
 * Handles Supabase authentication operations like login, register, social auth
 */

const { createClient } = require('../../lib/supabase/server');

/**
 * Register a new user with email and password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, password, and name are required'
      });
    }

    const supabase = createClient(req, res);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'user'
        }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: 'Registration failed'
      });
    }

    res.status(201).json({
      success: true,
      data: {
        user: data.user,
        session: data.session
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
};

/**
 * Login a user with email and password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    const supabase = createClient(req, res);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
        message: 'Login failed'
      });
    }

    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
};

/**
 * Logout a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = async (req, res) => {
  try {
    const supabase = createClient(req, res);

    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: 'Logout failed'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No user session found'
      });
    }

    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message
    });
  }
};

/**
 * Initiate Google OAuth authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const googleAuth = async (req, res) => {
  try {
    const supabase = createClient(req, res);
    const { redirectTo } = req.query;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${req.protocol}://${req.get('host')}/api/v1/auth/callback`
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: 'Google authentication failed'
      });
    }

    // Redirect to Google OAuth URL
    res.redirect(data.url);
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Google authentication failed',
      message: error.message
    });
  }
};

/**
 * Initiate GitHub OAuth authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const githubAuth = async (req, res) => {
  try {
    const supabase = createClient(req, res);
    const { redirectTo } = req.query;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectTo || `${req.protocol}://${req.get('host')}/api/v1/auth/callback`
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: 'GitHub authentication failed'
      });
    }

    // Redirect to GitHub OAuth URL
    res.redirect(data.url);
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({
      success: false,
      error: 'GitHub authentication failed',
      message: error.message
    });
  }
};

/**
 * Handle OAuth callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const authCallback = async (req, res) => {
  try {
    const { code, error: authError } = req.query;

    if (authError) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=${authError}`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=no_code`);
    }

    const supabase = createClient(req, res);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=${error.message}`);
    }

    // Successful authentication - redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=callback_failed`);
  }
};

/**
 * Refresh user session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshSession = async (req, res) => {
  try {
    const supabase = createClient(req, res);

    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
        message: 'Session refresh failed'
      });
    }

    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session
      },
      message: 'Session refreshed successfully'
    });
  } catch (error) {
    console.error('Session refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Session refresh failed',
      message: error.message
    });
  }
};

/**
 * Get current session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSession = async (req, res) => {
  try {
    const supabase = createClient(req, res);

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to get session'
      });
    }

    res.json({
      success: true,
      data: {
        session: data.session
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session',
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  googleAuth,
  githubAuth,
  authCallback,
  refreshSession,
  getSession
}; 