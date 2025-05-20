/**
 * Notification Service
 * 
 * Main entry point for the Notification Service microservice
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3004;

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
        <title>SpendSync Notification Service</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .endpoint { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>SpendSync Notification Service</h1>
        <p>The Notification Service is running successfully. Available endpoints:</p>
        <div class="endpoint">/health - Service health check</div>
        <div class="endpoint">/notifications - Get all notifications</div>
        <div class="endpoint">/notifications/:id - Get notification by ID</div>
        <div class="endpoint">/users/:userId/notifications - Get notifications for user</div>
        <div class="endpoint">POST /notifications - Create a new notification</div>
      </body>
    </html>
  `);
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Notification routes
app.get('/notifications', (req, res) => {
  res.json({
    notifications: [
      { 
        id: '1', 
        userId: '1',
        type: 'expense_created',
        message: 'New expense added to your group',
        read: false,
        data: { expenseId: '101', groupId: '1' },
        createdAt: new Date().toISOString()
      },
      { 
        id: '2', 
        userId: '1',
        type: 'settlement_reminder',
        message: 'You have a pending settlement',
        read: true,
        data: { settlementId: '201' },
        createdAt: new Date().toISOString()
      }
    ]
  });
});

app.get('/notifications/:id', (req, res) => {
  const notificationId = req.params.id;
  res.json({
    id: notificationId,
    userId: '1',
    type: 'expense_created',
    message: `Notification ${notificationId}`,
    read: false,
    data: { expenseId: '101', groupId: '1' },
    createdAt: new Date().toISOString()
  });
});

app.get('/users/:userId/notifications', (req, res) => {
  const userId = req.params.userId;
  res.json({
    notifications: [
      { 
        id: '1', 
        userId: userId,
        type: 'expense_created',
        message: 'New expense added to your group',
        read: false,
        data: { expenseId: '101', groupId: '1' },
        createdAt: new Date().toISOString()
      },
      { 
        id: '2', 
        userId: userId,
        type: 'settlement_reminder',
        message: 'You have a pending settlement',
        read: true,
        data: { settlementId: '201' },
        createdAt: new Date().toISOString()
      }
    ]
  });
});

// Send notification
app.post('/notifications', (req, res) => {
  const { userId, type, message, data } = req.body;
  
  if (!userId || !type || !message) {
    return res.status(400).json({
      error: 'Missing required fields: userId, type, message'
    });
  }
  
  res.status(201).json({
    id: Math.floor(Math.random() * 1000).toString(),
    userId,
    type,
    message,
    data: data || {},
    read: false,
    createdAt: new Date().toISOString()
  });
});

// Start server
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
}

module.exports = app; 