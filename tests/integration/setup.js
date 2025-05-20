/**
 * Integration Test Setup
 * 
 * This file contains setup and teardown logic for integration tests,
 * including in-memory MongoDB server configuration.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const nock = require('nock');

let mongoServer;

/**
 * Mock Redis for testing
 */
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  on: jest.fn()
};

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue(mockRedis)
}));

/**
 * Setup Redis mock responses
 */
module.exports.setupRedisMock = () => {
  // Reset all mocks
  mockRedis.get.mockReset();
  mockRedis.set.mockReset();
  mockRedis.del.mockReset();
  mockRedis.keys.mockReset();

  // Setup default successful responses
  mockRedis.get.mockImplementation((key) => Promise.resolve(null));
  mockRedis.set.mockImplementation((key, value) => Promise.resolve('OK'));
  mockRedis.del.mockImplementation((key) => Promise.resolve(1));
  mockRedis.keys.mockImplementation((pattern) => Promise.resolve([]));
};

/**
 * Connect to the in-memory database
 */
module.exports.setupDB = async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Set Mongoose options
  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  // Connect to the in-memory MongoDB instance
  await mongoose.connect(uri, mongooseOpts);
};

/**
 * Drop database, close the connection and stop MongoDB Memory Server
 */
module.exports.teardownDB = async () => {
  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Remove all the data for all the collections in the database
 */
module.exports.clearDatabase = async () => {
  if (mongoose.connection.readyState) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

/**
 * Setup mock services for integration testing
 */
module.exports.setupMockServices = () => {
  // Clear any existing nock interceptors
  nock.cleanAll();

  // Mock User Service
  nock('http://user-service:3001')
    .persist()
    .get('/health')
    .reply(200, {
      status: 'UP',
      service: 'user-service',
      timestamp: new Date().toISOString()
    })
    .get('/api/users')
    .reply(200, {
      success: true,
      data: [
        { id: '1', username: 'user1', email: 'user1@test.com' },
        { id: '2', username: 'user2', email: 'user2@test.com' }
      ]
    })
    .get('/api/users/:userId')
    .reply(function(uri) {
      const userId = uri.split('/').pop();
      if (userId === '999') {
        return [404, {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        }];
      }
      return [200, {
        success: true,
        data: {
          id: userId,
          username: `user${userId}`,
          email: `user${userId}@test.com`
        }
      }];
    });

  // Mock Expense Service
  nock('http://expense-service:3002')
    .persist()
    .get('/health')
    .reply(200, {
      status: 'UP',
      service: 'expense-service',
      timestamp: new Date().toISOString()
    })
    .get('/api/expenses/group/:groupId')
    .reply(function(uri) {
      const groupId = uri.split('/').pop();
      return [200, {
        success: true,
        data: [
          {
            id: 'expense1',
            groupId: groupId,
            amount: 100,
            currency: 'USD',
            paidBy: 'user1',
            splitBetween: ['user1', 'user2', 'user3'],
            description: 'Dinner'
          },
          {
            id: 'expense2',
            groupId: groupId,
            amount: 60,
            currency: 'USD',
            paidBy: 'user2',
            splitBetween: ['user1', 'user2'],
            description: 'Groceries'
          }
        ]
      }];
    });

  // Mock Settlement Service
  nock('http://settlement-service:3003')
    .persist()
    .get('/health')
    .reply(200, {
      status: 'UP',
      service: 'settlement-service',
      timestamp: new Date().toISOString()
    })
    .post('/api/settlements/calculate')
    .reply(200, {
      success: true,
      data: {
        transactions: [
          { from: 'user1', to: 'user2', amount: 30, currency: 'USD' },
          { from: 'user3', to: 'user1', amount: 20, currency: 'USD' }
        ]
      }
    });

  // Mock Notification Service
  nock('http://notification-service:3004')
    .persist()
    .get('/health')
    .reply(200, {
      status: 'UP',
      service: 'notification-service',
      timestamp: new Date().toISOString()
    })
    .get('/api/notifications/user/:userId')
    .reply(function(uri) {
      const userId = uri.split('/').pop();
      return [200, {
        success: true,
        data: [
          {
            id: 'notif1',
            userId: userId,
            type: 'EXPENSE_ADDED',
            message: 'New expense added to group',
            read: false,
            createdAt: new Date().toISOString()
          }
        ]
      }];
    })
    .post('/api/notifications')
    .reply(200, {
      success: true,
      data: {
        id: 'notif1',
        type: 'EXPENSE_ADDED',
        message: 'New expense added to group',
        createdAt: new Date().toISOString()
      }
    })
    .put('/api/notifications/:notifId/read')
    .reply(200, {
      success: true,
      data: {
        id: 'notif1',
        read: true,
        updatedAt: new Date().toISOString()
      }
    });
};

/**
 * Clean up all mocks
 */
module.exports.teardownMocks = () => {
  nock.cleanAll();
};

/**
 * Create a mock JWT token for testing authenticated endpoints
 * @param {string} userId - User ID to include in the token
 * @param {Array} roles - User roles
 * @returns {string} - JWT token
 */
module.exports.createMockToken = (userId = 'user1', roles = ['user']) => {
  // This is just a mock token for testing - not a real JWT
  return `mock_token_${userId}_${roles.join('_')}`;
}; 