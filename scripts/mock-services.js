/**
 * SpendSync Mock Services
 * 
 * This script starts mock servers for each microservice to facilitate testing
 * of the API Gateway and complex scenarios.
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// Mock data storage
const db = {
  users: [
    { id: 'user1', email: 'test@example.com', name: 'Test User', password: 'Password123!' }
  ],
  groups: [],
  expenses: [],
  settlements: [],
  payments: []
};

// JWT config
const JWT_SECRET = process.env.JWT_SECRET || 'spendsync-dev-jwt-secret';

// Create mock services
const createMockService = (name, port, routes) => {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  
  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${name}] ${req.method} ${req.path}`);
    next();
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: name });
  });
  
  // Register routes
  routes(app);
  
  // Start server
  const server = app.listen(port, () => {
    console.log(`Mock ${name} service running on port ${port}`);
  });
  
  return server;
};

// User Service routes
const userServiceRoutes = (app) => {
  // Register user
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    
    // Check if user exists
    if (db.users.find(u => u.email === email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }
    
    const newUser = { 
      id: `user${db.users.length + 1}`, 
      email, 
      password, 
      name 
    };
    
    db.users.push(newUser);
    
    const token = jwt.sign({ userId: newUser.id, email }, JWT_SECRET, { expiresIn: '1h' });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { id: newUser.id, email, name },
      token
    });
  });
  
  // Login user
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '1h' });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { id: user.id, email, name: user.name },
      token
    });
  });
  
  // Get user by ID
  app.get('/api/users/:userId', (req, res) => {
    const user = db.users.find(u => u.id === req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { password, ...userData } = user;
    
    res.status(200).json({
      success: true,
      data: userData
    });
  });
};

// Expense Service routes
const expenseServiceRoutes = (app) => {
  // Create group
  app.post('/api/groups', (req, res) => {
    const { name, description, members } = req.body;
    
    const newGroup = {
      id: `group${db.groups.length + 1}`,
      name,
      description,
      members: members || [],
      createdAt: new Date().toISOString()
    };
    
    db.groups.push(newGroup);
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: newGroup
    });
  });
  
  // Get groups
  app.get('/api/groups', (req, res) => {
    res.status(200).json({
      success: true,
      data: db.groups
    });
  });
  
  // Create expense
  app.post('/api/expenses', (req, res) => {
    const { 
      groupId, description, amount, paidBy, 
      splitType, splits, date, category 
    } = req.body;
    
    const newExpense = {
      id: `expense${db.expenses.length + 1}`,
      groupId,
      description,
      amount,
      paidBy,
      splitType,
      splits,
      date: date || new Date().toISOString(),
      category,
      createdAt: new Date().toISOString()
    };
    
    db.expenses.push(newExpense);
    
    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: newExpense
    });
  });
  
  // Get expenses for group
  app.get('/api/groups/:groupId/expenses', (req, res) => {
    const groupExpenses = db.expenses.filter(e => e.groupId === req.params.groupId);
    
    res.status(200).json({
      success: true,
      data: groupExpenses
    });
  });
};

// Settlement Service routes
const settlementServiceRoutes = (app) => {
  // Generate settlements
  app.post('/api/settlements/generate/:groupId', (req, res) => {
    const { groupId } = req.params;
    
    // Get expenses for the group
    const groupExpenses = db.expenses.filter(e => e.groupId === groupId);
    
    if (groupExpenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No expenses found for this group'
      });
    }
    
    // Create mock settlements (simplified algorithm)
    const settlements = [];
    const uniqueUsers = new Set();
    
    // Extract all users involved in expenses
    groupExpenses.forEach(expense => {
      uniqueUsers.add(expense.paidBy);
      expense.splits.forEach(split => uniqueUsers.add(split.userId));
    });
    
    const users = Array.from(uniqueUsers);
    
    // Create simple settlements between first and other users
    for (let i = 1; i < users.length; i++) {
      const settlementAmount = Math.round(Math.random() * 100) / 2;
      
      const settlement = {
        id: `settlement${db.settlements.length + 1}`,
        groupId,
        from: users[i],
        to: users[0],
        amount: settlementAmount,
        currency: 'USD',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      db.settlements.push(settlement);
      settlements.push(settlement);
    }
    
    res.status(200).json({
      success: true,
      message: 'Settlements generated successfully',
      data: {
        settlementIds: settlements.map(s => s.id),
        settlements
      }
    });
  });
  
  // Process settlement payment
  app.post('/api/settlements/:settlementId/pay', (req, res) => {
    const { settlementId } = req.params;
    const { paymentMethodId } = req.body;
    
    const settlement = db.settlements.find(s => s.id === settlementId);
    
    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found'
      });
    }
    
    // Update settlement
    settlement.status = 'paid';
    settlement.paidAt = new Date().toISOString();
    
    // Create payment record
    const payment = {
      id: `payment${db.payments.length + 1}`,
      settlementId,
      paymentMethodId,
      amount: settlement.amount,
      currency: settlement.currency,
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    
    db.payments.push(payment);
    
    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        settlement,
        payment
      }
    });
  });
};

// Analytics Service routes
const analyticsServiceRoutes = (app) => {
  // Get spending analytics
  app.get('/api/analytics/spending', (req, res) => {
    const { timeframe, groupBy, includeCategories } = req.query;
    
    // Generate mock analytics data
    const categories = includeCategories ? 
      includeCategories.split(',') : 
      ['food', 'transport', 'accommodation', 'entertainment'];
    
    const analytics = categories.map(category => ({
      category,
      totalSpent: Math.round(Math.random() * 1000) / 2,
      count: Math.floor(Math.random() * 10) + 1,
      average: Math.round(Math.random() * 100) / 2
    }));
    
    // Sort by total spent
    analytics.sort((a, b) => b.totalSpent - a.totalSpent);
    
    res.status(200).json({
      success: true,
      data: {
        timeframe: timeframe || 'last3Months',
        groupBy: groupBy || 'category',
        analytics
      }
    });
  });
};

// Start mock services
const startServices = () => {
  // Define service ports
  const ports = {
    user: 4001,
    expense: 4002,
    settlement: 4003,
    notification: 4004,
    payment: 4005,
    analytics: 4006
  };
  
  // Start each service
  createMockService('User', ports.user, userServiceRoutes);
  createMockService('Expense', ports.expense, expenseServiceRoutes);
  createMockService('Settlement', ports.settlement, settlementServiceRoutes);
  createMockService('Analytics', ports.analytics, analyticsServiceRoutes);
  
  console.log('All mock services started successfully');
  console.log('Use Ctrl+C to stop all services');
};

// Start services if this script is run directly
if (require.main === module) {
  startServices();
}

module.exports = { startServices }; 