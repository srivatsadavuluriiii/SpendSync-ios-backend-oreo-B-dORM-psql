/**
 * User Service
 * 
 * Main entry point for the User Service microservice
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No valid token provided'
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: error?.message || 'Authentication failed'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>SpendSync User Service</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .endpoint { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>SpendSync User Service</h1>
        <p>The User Service is running successfully with Supabase Auth. Available endpoints:</p>
        <div class="endpoint">/health - Service health check</div>
        <div class="endpoint">/users - Get all user profiles (requires auth)</div>
        <div class="endpoint">/users/:id - Get user profile by ID (requires auth)</div>
        <div class="endpoint">/users/me - Get current user profile (requires auth)</div>
        <div class="endpoint">/groups - Get user's groups (requires auth)</div>
        <div class="endpoint">/groups/:id - Get group by ID (requires auth)</div>
      </body>
    </html>
  `);
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    supabase: process.env.SUPABASE_URL ? 'connected' : 'not configured'
  });
});

// Get current user profile
app.get('/users/me', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        profile: profile || null,
        created_at: req.user.created_at
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      message: error.message
    });
  }
});

// Get all user profiles (admin only or for service-to-service)
app.get('/users', authenticate, async (req, res) => {
  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_id
      `)
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      data: profiles || [],
      count: profiles?.length || 0
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      message: error.message
    });
  }
});

// Get user profile by ID
app.get('/users/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user profile found with this ID'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message
    });
  }
});

// Get user's groups
app.get('/groups', authenticate, async (req, res) => {
  try {
    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .contains('members', [req.user.id]);

    if (error) throw error;

    res.json({
      success: true,
      data: groups || [],
      count: groups?.length || 0
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get groups',
      message: error.message
    });
  }
});

// Get group by ID
app.get('/groups/:id', authenticate, async (req, res) => {
  try {
    const groupId = req.params.id;
    
    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        message: 'No group found with this ID'
      });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.id) && group.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You are not a member of this group'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group',
      message: error.message
    });
  }
});

// Start server
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'configured' : 'not configured'}`);
  });
}

module.exports = app; 