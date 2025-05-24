/**
 * Expense Service
 * 
 * Main entry point for the Expense Service microservice
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

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
        <title>SpendSync Expense Service</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .endpoint { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>SpendSync Expense Service</h1>
        <p>The Expense Service is running successfully with Supabase Auth. Available endpoints:</p>
        <div class="endpoint">/health - Service health check</div>
        <div class="endpoint">/expenses - Get user's expenses (requires auth)</div>
        <div class="endpoint">/expenses/:id - Get expense by ID (requires auth)</div>
        <div class="endpoint">/groups/:groupId/expenses - Get expenses for a group (requires auth)</div>
        <div class="endpoint">POST /expenses - Create new expense (requires auth)</div>
        <div class="endpoint">PUT /expenses/:id - Update expense (requires auth)</div>
        <div class="endpoint">DELETE /expenses/:id - Delete expense (requires auth)</div>
      </body>
    </html>
  `);
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'expense-service',
    timestamp: new Date().toISOString(),
    supabase: process.env.SUPABASE_URL ? 'connected' : 'not configured'
  });
});

// Get user's expenses
app.get('/expenses', authenticate, async (req, res) => {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        created_by_profile:user_profiles!expenses_created_by_fkey(first_name, last_name),
        group:groups(name)
      `)
      .or(`created_by.eq.${req.user.id},participants.cs.["${req.user.id}"]`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: expenses || [],
      count: expenses?.length || 0
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get expenses',
      message: error.message
    });
  }
});

// Get expense by ID
app.get('/expenses/:id', authenticate, async (req, res) => {
  try {
    const expenseId = req.params.id;
    
    const { data: expense, error } = await supabase
      .from('expenses')
      .select(`
        *,
        created_by_profile:user_profiles!expenses_created_by_fkey(first_name, last_name),
        group:groups(name, members)
      `)
      .eq('id', expenseId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
        message: 'No expense found with this ID'
      });
    }

    // Check if user has access to this expense
    const hasAccess = expense.created_by === req.user.id || 
                     expense.participants.includes(req.user.id) ||
                     expense.group?.members?.includes(req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this expense'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get expense',
      message: error.message
    });
  }
});

// Get expenses for a group
app.get('/groups/:groupId/expenses', authenticate, async (req, res) => {
  try {
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

    if (!group.members.includes(req.user.id) && group.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You are not a member of this group'
      });
    }

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        created_by_profile:user_profiles!expenses_created_by_fkey(first_name, last_name)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: expenses || [],
      count: expenses?.length || 0
    });
  } catch (error) {
    console.error('Get group expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group expenses',
      message: error.message
    });
  }
});

// Create new expense
app.post('/expenses', authenticate, async (req, res) => {
  try {
    const { title, description, amount, currency, category, group_id, participants, split_method, split_details } = req.body;

    if (!title || !amount || !group_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, amount, and group_id are required'
      });
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        title,
        description,
        amount,
        currency: currency || 'USD',
        category,
        created_by: req.user.id,
        group_id,
        participants: participants || [req.user.id],
        split_method: split_method || 'equal',
        split_details: split_details || {}
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully'
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create expense',
      message: error.message
    });
  }
});

// Update expense
app.put('/expenses/:id', authenticate, async (req, res) => {
  try {
    const expenseId = req.params.id;
    const updates = req.body;

    // Check if user owns the expense
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('created_by')
      .eq('id', expenseId)
      .single();

    if (fetchError || !expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
        message: 'No expense found with this ID'
      });
    }

    if (expense.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only update your own expenses'
      });
    }

    const { data: updatedExpense, error } = await supabase
      .from('expenses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: updatedExpense,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense',
      message: error.message
    });
  }
});

// Delete expense
app.delete('/expenses/:id', authenticate, async (req, res) => {
  try {
    const expenseId = req.params.id;

    // Check if user owns the expense
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('created_by')
      .eq('id', expenseId)
      .single();

    if (fetchError || !expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
        message: 'No expense found with this ID'
      });
    }

    if (expense.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only delete your own expenses'
      });
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense',
      message: error.message
    });
  }
});

// Start server
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`Expense Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'configured' : 'not configured'}`);
  });
}

module.exports = app; 