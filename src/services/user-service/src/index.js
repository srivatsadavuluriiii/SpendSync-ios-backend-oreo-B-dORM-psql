/**
 * User Service
 * 
 * Main entry point for the User Service microservice
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

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
        <p>The User Service is running successfully. Available endpoints:</p>
        <div class="endpoint">/health - Service health check</div>
        <div class="endpoint">/users - Get all users</div>
        <div class="endpoint">/users/:id - Get user by ID</div>
        <div class="endpoint">/groups - Get all groups</div>
        <div class="endpoint">/groups/:id - Get group by ID</div>
      </body>
    </html>
  `);
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// User routes
app.get('/users', (req, res) => {
  res.json({
    users: [
      { id: '1', username: 'user1', email: 'user1@example.com' },
      { id: '2', username: 'user2', email: 'user2@example.com' }
    ]
  });
});

app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({
    id: userId,
    username: `user${userId}`,
    email: `user${userId}@example.com`,
    groups: [`group${userId}`]
  });
});

// Group routes
app.get('/groups', (req, res) => {
  res.json({
    groups: [
      { id: '1', name: 'Friends', ownerUserId: '1' },
      { id: '2', name: 'Family', ownerUserId: '2' }
    ]
  });
});

app.get('/groups/:id', (req, res) => {
  const groupId = req.params.id;
  res.json({
    id: groupId,
    name: `Group ${groupId}`,
    ownerUserId: '1',
    members: ['1', '2', '3']
  });
});

// Start server
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
}

module.exports = app; 