/**
 * Mock Services for Development and Testing
 * 
 * Updated to use Supabase Auth instead of JWT
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

// Mock data
const mockUsers = [
  { id: '1', email: 'user1@example.com', name: 'User One' },
  { id: '2', email: 'user2@example.com', name: 'User Two' },
  { id: '3', email: 'admin@example.com', name: 'Admin User', role: 'admin' }
];

const mockExpenses = [
  { id: '1', description: 'Dinner', amount: 50.00, userId: '1', groupId: '1' },
  { id: '2', description: 'Movie tickets', amount: 30.00, userId: '2', groupId: '1' }
];

// Create mock services
function createMockService(name, port, routes) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: name });
  });

  // Add custom routes
  Object.entries(routes).forEach(([path, handler]) => {
    const [method, route] = path.split(' ');
    app[method.toLowerCase()](route, handler);
  });

  app.listen(port, () => {
    console.log(`Mock ${name} running on port ${port}`);
  });

  return app;
}

// User Service Mock
createMockService('User Service', 3001, {
  'GET /users': (req, res) => {
    res.json(mockUsers);
  },
  'GET /users/:id': (req, res) => {
    const user = mockUsers.find(u => u.id === req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  },
  'POST /users': (req, res) => {
    const newUser = {
      id: String(mockUsers.length + 1),
      ...req.body
    };
    mockUsers.push(newUser);
    res.status(201).json(newUser);
  }
});

// Expense Service Mock
createMockService('Expense Service', 3002, {
  'GET /expenses': (req, res) => {
    res.json(mockExpenses);
  },
  'POST /expenses': (req, res) => {
    const newExpense = {
      id: String(mockExpenses.length + 1),
      ...req.body
    };
    mockExpenses.push(newExpense);
    res.status(201).json(newExpense);
  }
});

// Settlement Service Mock
createMockService('Settlement Service', 3003, {
  'GET /settlements': (req, res) => {
    res.json([
      { id: '1', fromUserId: '1', toUserId: '2', amount: 25.00, status: 'pending' }
    ]);
  },
  'POST /settlements': (req, res) => {
    res.status(201).json({ id: '2', ...req.body, status: 'pending' });
  }
});

// Notification Service Mock
createMockService('Notification Service', 3004, {
  'POST /notifications': (req, res) => {
    console.log('Mock notification sent:', req.body);
    res.status(201).json({ id: '1', ...req.body, sent: true });
  }
});

// Payment Service Mock
createMockService('Payment Service', 3005, {
  'POST /payments': (req, res) => {
    res.status(201).json({ 
      id: '1', 
      ...req.body, 
      status: 'completed',
      transactionId: 'mock_txn_' + Date.now()
    });
  }
});

// Analytics Service Mock
createMockService('Analytics Service', 3006, {
  'GET /analytics/summary': (req, res) => {
    res.json({
      totalExpenses: 80.00,
      totalUsers: mockUsers.length,
      totalSettlements: 1
    });
  }
});

console.log('All mock services started successfully!'); 