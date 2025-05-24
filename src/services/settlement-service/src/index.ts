/// <reference path="./types/modules.d.ts" />
/// <reference path="./types/middleware.d.ts" />

/**
 * Settlement Service
 * 
 * Main entry point for the Settlement Service that handles
 * debt optimization and settlement tracking with Supabase Auth
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json } from 'express';
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';

const app = express();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Auth middleware
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

    (req as any).user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: (error as Error).message
    });
  }
};

// Middleware
app.use(cors());
app.use(helmet());
app.use(json());

// Root route
app.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>SpendSync Settlement Service</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .endpoint { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>SpendSync Settlement Service</h1>
        <p>The Settlement Service is running successfully with Supabase Auth. Available endpoints:</p>
        <div class="endpoint">/health - Service health check</div>
        <div class="endpoint">/settlements - Get user's settlements (requires auth)</div>
        <div class="endpoint">/settlements/:id - Get settlement by ID (requires auth)</div>
        <div class="endpoint">POST /settlements - Create new settlement (requires auth)</div>
        <div class="endpoint">PUT /settlements/:id - Update settlement (requires auth)</div>
        <div class="endpoint">/groups/:groupId/settlements - Get group settlements (requires auth)</div>
      </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'UP',
    service: 'settlement-service',
    timestamp: new Date().toISOString(),
    supabase: process.env.SUPABASE_URL ? 'connected' : 'not configured',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Get user's settlements
app.get('/settlements', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data: settlements, error } = await supabase
      .from('settlements')
      .select(`
        *,
        from_user_profile:user_profiles!settlements_from_user_fkey(first_name, last_name),
        to_user_profile:user_profiles!settlements_to_user_fkey(first_name, last_name),
        group:groups(name)
      `)
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: settlements || [],
      count: settlements?.length || 0
    });
  } catch (error) {
    logger.error('Get settlements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settlements',
      message: (error as Error).message
    });
  }
});

// Get settlement by ID
app.get('/settlements/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const settlementId = req.params.id;
    
    const { data: settlement, error } = await supabase
      .from('settlements')
      .select(`
        *,
        from_user_profile:user_profiles!settlements_from_user_fkey(first_name, last_name),
        to_user_profile:user_profiles!settlements_to_user_fkey(first_name, last_name),
        group:groups(name, members)
      `)
      .eq('id', settlementId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!settlement) {
      return res.status(404).json({
        success: false,
        error: 'Settlement not found',
        message: 'No settlement found with this ID'
      });
    }

    // Check if user has access to this settlement
    if (settlement.from_user !== user.id && settlement.to_user !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this settlement'
      });
    }

    res.json({
      success: true,
      data: settlement
    });
  } catch (error) {
    logger.error('Get settlement by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settlement',
      message: (error as Error).message
    });
  }
});

// Create new settlement
app.post('/settlements', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { to_user, amount, currency, group_id, payment_method, notes } = req.body;

    if (!to_user || !amount || !group_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'to_user, amount, and group_id are required'
      });
    }

    if (to_user === user.id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settlement',
        message: 'Cannot create settlement to yourself'
      });
    }

    const { data: settlement, error } = await supabase
      .from('settlements')
      .insert({
        from_user: user.id,
        to_user,
        amount,
        currency: currency || 'USD',
        group_id,
        payment_method,
        notes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: settlement,
      message: 'Settlement created successfully'
    });
  } catch (error) {
    logger.error('Create settlement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create settlement',
      message: (error as Error).message
    });
  }
});

// Update settlement
app.put('/settlements/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const settlementId = req.params.id;
    const updates = req.body;

    // Check if user has access to this settlement
    const { data: settlement, error: fetchError } = await supabase
      .from('settlements')
      .select('from_user, to_user, status')
      .eq('id', settlementId)
      .single();

    if (fetchError || !settlement) {
      return res.status(404).json({
        success: false,
        error: 'Settlement not found',
        message: 'No settlement found with this ID'
      });
    }

    if (settlement.from_user !== user.id && settlement.to_user !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this settlement'
      });
    }

    // If marking as completed, add settled_at timestamp
    if (updates.status === 'completed' && settlement.status !== 'completed') {
      updates.settled_at = new Date().toISOString();
    }

    const { data: updatedSettlement, error } = await supabase
      .from('settlements')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', settlementId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: updatedSettlement,
      message: 'Settlement updated successfully'
    });
  } catch (error) {
    logger.error('Update settlement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settlement',
      message: (error as Error).message
    });
  }
});

// Get group settlements
app.get('/groups/:groupId/settlements', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const groupId = req.params.groupId;
    
    // First check if user is a member of the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('members, created_by')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        message: 'No group found with this ID'
      });
    }

    if (!group.members.includes(user.id) && group.created_by !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You are not a member of this group'
      });
    }

    const { data: settlements, error } = await supabase
      .from('settlements')
      .select(`
        *,
        from_user_profile:user_profiles!settlements_from_user_fkey(first_name, last_name),
        to_user_profile:user_profiles!settlements_to_user_fkey(first_name, last_name)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: settlements || [],
      count: settlements?.length || 0
    });
  } catch (error) {
    logger.error('Get group settlements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group settlements',
      message: (error as Error).message
    });
  }
});

const PORT = process.env.PORT || 4003;

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    if (config.env !== 'development') {
      await mongoose.connect(config.mongodb.uri);
      logger.info('Connected to MongoDB');
    } else {
      logger.warn('Running in development mode without MongoDB connection');
    }

    const server = app.listen(PORT, () => {
      logger.info(`Settlement Service running on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`Supabase URL: ${process.env.SUPABASE_URL ? 'configured' : 'not configured'}`);
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export { app }; 