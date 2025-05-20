const express = require('express');
const app = express();
const PORT = 3004; // Match the port expected by the gateway for Notification Service

// In-memory storage for notifications
const notifications = {};

// Enable JSON parsing
app.use(express.json());

// Health check endpoint - this is used by the circuit breaker
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Get notifications for a user
app.get('/api/v1/notifications', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'User ID is required'
      }
    });
  }
  
  // Return notifications for the user, or empty array if none exist
  const userNotifications = notifications[userId] || [];
  
  res.json({
    success: true,
    count: userNotifications.length,
    notifications: userNotifications
  });
});

// Create notification - this is called by other services
app.post('/api/v1/notifications', (req, res) => {
  const { type, data, recipients } = req.body;
  
  if (!type || !data || !recipients || !Array.isArray(recipients)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid notification data'
      }
    });
  }
  
  const notificationId = Date.now().toString();
  
  // Notification base object
  const notificationBase = {
    id: notificationId,
    type,
    data,
    read: false,
    createdAt: new Date().toISOString()
  };
  
  // Create a notification for each recipient
  recipients.forEach(userId => {
    if (!notifications[userId]) {
      notifications[userId] = [];
    }
    
    // Add user-specific notification message
    let message = '';
    
    switch (type) {
      case 'expense_created':
        if (userId === data.paidBy) {
          message = `You paid ${data.amount} ${data.currency} for "${data.description}"`;
        } else {
          message = `${data.paidBy} paid ${data.amount} ${data.currency} for "${data.description}"`;
        }
        break;
      case 'balance_settled':
        if (userId === data.from) {
          message = `You paid ${data.amount} ${data.currency} to ${data.to}`;
        } else if (userId === data.to) {
          message = `${data.from} paid you ${data.amount} ${data.currency}`;
        }
        break;
      default:
        message = `New notification: ${type}`;
    }
    
    // Create the complete notification
    const notification = {
      ...notificationBase,
      userId,
      message
    };
    
    notifications[userId].push(notification);
  });
  
  res.status(201).json({
    success: true,
    notification: {
      id: notificationId,
      recipients: recipients.length
    }
  });
});

// Mark notification as read
app.put('/api/v1/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'User ID is required'
      }
    });
  }
  
  // Check if user has notifications
  if (!notifications[userId]) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'No notifications found for this user'
      }
    });
  }
  
  // Find and update the notification
  const notificationIndex = notifications[userId].findIndex(n => n.id === id);
  
  if (notificationIndex === -1) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Notification not found'
      }
    });
  }
  
  notifications[userId][notificationIndex].read = true;
  
  res.json({
    success: true,
    notification: notifications[userId][notificationIndex]
  });
});

// Get notification counts (unread)
app.get('/api/v1/notifications/count', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'User ID is required'
      }
    });
  }
  
  // Count unread notifications
  const userNotifications = notifications[userId] || [];
  const unreadCount = userNotifications.filter(n => !n.read).length;
  
  res.json({
    success: true,
    count: {
      total: userNotifications.length,
      unread: unreadCount
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock Notification Service running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Get notifications: http://localhost:${PORT}/api/v1/notifications?userId=123`);
  console.log(`Create notification: http://localhost:${PORT}/api/v1/notifications (POST)`);
  console.log(`Mark as read: http://localhost:${PORT}/api/v1/notifications/123/read?userId=456 (PUT)`);
  console.log(`Get counts: http://localhost:${PORT}/api/v1/notifications/count?userId=123`);
}); 