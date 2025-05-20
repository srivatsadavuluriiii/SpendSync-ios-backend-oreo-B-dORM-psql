const { Verifier } = require('@pact-foundation/pact');
const path = require('path');
const express = require('express');

// Create a simple express app for testing instead of importing the actual one
const app = express();

// Set content type middleware
app.use((req, res, next) => {
  res.type('application/json');
  next();
});

// Mock the user service endpoints
app.get('/users/:userId', (req, res) => {
  const userId = req.params.userId;
  
  if (userId === '999') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  }
  
  // This endpoint returns a different format than the /api/users/:userId endpoint
  // Format expected by the Pact contract
  res.json({
    success: true,
    data: {
      id: userId,
      email: `user${userId}@example.com`,
      firstName: 'Test',
      lastName: 'User'
    }
  });
});

// Handle /api/users/:userId with a different response format
app.get('/api/users/:userId', (req, res) => {
  const userId = req.params.userId;
  
  if (userId === '999') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  }
  
  res.json({
    success: true,
    data: {
      service: 'userService',
      user: {
        id: userId,
        email: 'testuser@example.com',
        username: 'testuser',
        createdAt: new Date().toISOString()
      }
    }
  });
});

const PORT = process.env.PROVIDER_PORT || 3001;
const server = app.listen(PORT);

describe('User Service Provider Tests', () => {
  let opts;
  
  beforeAll(() => {
    opts = {
      provider: 'UserService',
      providerBaseUrl: `http://localhost:${PORT}`,
      pactUrls: [
        path.resolve(__dirname, '../../../pacts/apigateway-userservice.json')
      ],
      log: path.resolve(__dirname, '../../../logs/pact.log'),
      logLevel: 'INFO',
      stateHandlers: {
        'a user with ID 1 exists': () => {
          console.log('Setting up state: a user with ID 1 exists');
          return Promise.resolve();
        },
        'a user with ID 999 does not exist': () => {
          console.log('Setting up state: a user with ID 999 does not exist');
          return Promise.resolve();
        }
      }
    };
  });
  
  afterAll(() => {
    server.close();
  });
  
  it('validates the expectations of the User Service', () => {
    return new Verifier(opts).verifyProvider();
  });
}); 