const express = require('express');
const app = express();
const PORT = 3001; // Match the port expected by the gateway for User Service

// Enable JSON parsing
app.use(express.json());

// Health check endpoint - this is used by the circuit breaker
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Mock user endpoints
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'test@example.com' && password === 'password') {
    res.json({
      success: true,
      user: {
        id: '1234',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user']
      },
      token: 'mock-jwt-token'
    });
  } else {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid credentials'
      }
    });
  }
});

app.get('/api/v1/users/me', (req, res) => {
  // Check for authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required'
      }
    });
  }
  
  // Mock user data
  res.json({
    success: true,
    user: {
      id: '1234',
      email: 'test@example.com',
      name: 'Test User',
      profileImage: 'https://example.com/avatar.jpg',
      roles: ['user'],
      preferences: {
        currency: 'USD',
        language: 'en'
      },
      stats: {
        expensesCount: 12,
        groupsCount: 3,
        settlementsCount: 5
      },
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-06-15T00:00:00.000Z'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock User Service running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Login endpoint: http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`User profile endpoint: http://localhost:${PORT}/api/v1/users/me`);
}); 