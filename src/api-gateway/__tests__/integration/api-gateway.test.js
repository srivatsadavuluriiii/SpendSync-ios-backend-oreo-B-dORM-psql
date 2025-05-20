/**
 * Integration tests for API Gateway
 */

const request = require('supertest');
const nock = require('nock');
const app = require('../../index');

// Mock the auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', roles: ['user'] };
    next();
  })
}));

describe('API Gateway Integration Tests', () => {
  beforeAll(() => {
    // Set up nock to intercept HTTP requests to services
    // User Service
    nock('http://localhost:3001')
      .persist()
      .get('/')
      .reply(200, {
        success: true,
        data: {
          service: 'userService',
          users: [
            { id: 'user1', username: 'testuser1', email: 'test1@example.com' },
            { id: 'user2', username: 'testuser2', email: 'test2@example.com' }
          ]
        }
      });
    
    // Expense Service
    nock('http://localhost:3002')
      .persist()
      .get('/')
      .reply(200, {
        success: true,
        data: {
          service: 'expenseService',
          expenses: [
            {
              id: 'expense1',
              description: 'Dinner',
              amount: 100,
              currency: 'USD',
              payerId: 'user1',
              participantIds: ['user1', 'user2'],
              createdAt: new Date().toISOString()
            }
          ]
        }
      });
    
    // Settlement Service
    nock('http://localhost:3003')
      .persist()
      .get('/')
      .reply(200, {
        success: true,
        data: {
          service: 'settlementService',
          settlements: [
            {
              id: 'settlement1',
              payerId: 'user1',
              receiverId: 'user2',
              amount: 50,
              currency: 'USD',
              status: 'pending',
              groupId: 'group1',
              createdAt: new Date().toISOString()
            }
          ]
        }
      })
      .get('/calculation/group1')
      .reply(200, {
        success: true,
        data: {
          service: 'settlementService',
          algorithm: 'minCashFlow',
          breakdown: {
            inputDebts: [],
            userBalances: {},
            calculationSteps: []
          },
          explanation: {
            summary: 'Test summary',
            algorithmExplanation: 'Test explanation',
            stepByStepExplanation: ['Step 1'],
            transactionSummary: ['User1 pays 50 USD to User2']
          },
          settlements: [],
          stats: {
            originalTransactionCount: 3,
            optimizedTransactionCount: 2,
            reductionPercentage: 33
          }
        }
      });
    
    // Notification Service
    nock('http://localhost:3004')
      .persist()
      .get('/')
      .reply(200, {
        success: true,
        data: {
          service: 'notificationService',
          notifications: [
            {
              id: 'notification1',
              type: 'settlement',
              message: 'Settlement completed',
              read: false,
              createdAt: new Date().toISOString()
            }
          ]
        }
      });
  });
  
  afterAll(() => {
    nock.cleanAll();
  });
  
  describe('Health Check', () => {
    test('should return 200 OK and UP status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'UP');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
  
  describe('UI Routes', () => {
    test('should return HTML for homepage', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /html/)
        .expect(200);
      
      expect(response.text).toContain('SpendSync API Gateway');
      expect(response.text).toContain('The following services are available');
    });
    
    test('should return HTML for users dashboard', async () => {
      const response = await request(app)
        .get('/users-ui')
        .expect('Content-Type', /html/)
        .expect(200);
      
      expect(response.text).toContain('Users Dashboard');
    });
    
    test('should return HTML for settlements dashboard', async () => {
      const response = await request(app)
        .get('/settlements-ui')
        .expect('Content-Type', /html/)
        .expect(200);
      
      expect(response.text).toContain('Settlements Dashboard');
      expect(response.text).toContain('View Calculation Details');
    });
  });
  
  describe('API Routes', () => {
    test('should proxy requests to the User Service', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data.users).toHaveLength(2);
    });
    
    test('should proxy requests to the Expense Service', async () => {
      const response = await request(app)
        .get('/api/v1/expenses')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('expenses');
      expect(response.body.data.expenses).toHaveLength(1);
      expect(response.body.data.expenses[0]).toHaveProperty('description', 'Dinner');
    });
    
    test('should proxy requests to the Settlement Service', async () => {
      const response = await request(app)
        .get('/api/v1/settlements')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('settlements');
      expect(response.body.data.settlements).toHaveLength(1);
    });
    
    test('should proxy requests to the Settlement Calculation endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/settlements/calculation/group1')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('algorithm');
      expect(response.body.data).toHaveProperty('breakdown');
      expect(response.body.data).toHaveProperty('explanation');
      expect(response.body.data).toHaveProperty('stats');
    });
    
    test('should proxy requests to the Notification Service', async () => {
      const response = await request(app)
        .get('/api/v1/notifications')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data.notifications).toHaveLength(1);
      expect(response.body.data.notifications[0]).toHaveProperty('type', 'settlement');
    });
  });
  
  describe('Error Handling', () => {
    test('should return 404 for non-existent route', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect('Content-Type', /json/)
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('status', 404);
    });
  });
}); 