/**
 * Expense Service
 * 
 * Main entry point for the Expense Service microservice
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

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
        <p>The Expense Service is running successfully. Available endpoints:</p>
        <div class="endpoint">/health - Service health check</div>
        <div class="endpoint">/expenses - Get all expenses</div>
        <div class="endpoint">/expenses/:id - Get expense by ID</div>
        <div class="endpoint">/groups/:groupId/expenses - Get expenses for a group</div>
      </body>
    </html>
  `);
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'expense-service',
    timestamp: new Date().toISOString()
  });
});

// Expense routes
app.get('/expenses', (req, res) => {
  res.json({
    expenses: [
      { 
        id: '1', 
        description: 'Dinner', 
        amount: 120.00, 
        currency: 'USD',
        payerId: '1',
        groupId: '1',
        participantIds: ['1', '2', '3'],
        createdAt: new Date().toISOString()
      },
      { 
        id: '2', 
        description: 'Movie tickets', 
        amount: 45.00, 
        currency: 'USD',
        payerId: '2',
        groupId: '1',
        participantIds: ['1', '2'],
        createdAt: new Date().toISOString()
      }
    ]
  });
});

app.get('/expenses/:id', (req, res) => {
  const expenseId = req.params.id;
  res.json({
    id: expenseId,
    description: `Expense ${expenseId}`,
    amount: 100.00,
    currency: 'USD',
    payerId: '1',
    groupId: '1',
    participantIds: ['1', '2', '3'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
});

// Group expenses
app.get('/groups/:groupId/expenses', (req, res) => {
  const groupId = req.params.groupId;
  res.json({
    expenses: [
      { 
        id: '1', 
        description: 'Dinner', 
        amount: 120.00, 
        currency: 'USD',
        payerId: '1',
        groupId: groupId,
        participantIds: ['1', '2', '3'],
        createdAt: new Date().toISOString()
      },
      { 
        id: '2', 
        description: 'Movie tickets', 
        amount: 45.00, 
        currency: 'USD',
        payerId: '2',
        groupId: groupId,
        participantIds: ['1', '2'],
        createdAt: new Date().toISOString()
      }
    ]
  });
});

// Start server
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`Expense Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
}

module.exports = app; 