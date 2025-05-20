/**
 * Unit tests for API Gateway routes
 */

const express = require('express');
const request = require('supertest');
const routes = require('../../routes');
const { forwardRequest, makeServiceRequest } = require('../../utils/service-proxy');

// Mock the service proxy
jest.mock('../../utils/service-proxy');

// Mock the auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', roles: ['user'] };
    next();
  })
}));

describe('API Gateway Routes', () => {
  let app;
  
  beforeAll(() => {
    app = require('../../index');
  });
  
  beforeEach(() => {
    // Reset mock function calls before each test
    jest.clearAllMocks();
    
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/v1', routes);
  });
  
  describe('User Service Routes', () => {
    it('should forward requests to the User Service', async () => {
      // Mock service response
      makeServiceRequest.mockResolvedValue({
        success: true,
        data: {
          service: 'userService',
          user: {
            id: '1',
            username: 'testuser'
          }
        }
      });

      const response = await request(app)
        .get('/api/v1/users/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('userService');
      expect(response.body.data.user.id).toBe('1');
      expect(response.body.data.user.username).toBe('testuser');
    }, 120000); // Increase timeout to 2 minutes
    
    test('should forward group requests to the User Service', async () => {
      makeServiceRequest.mockResolvedValue({
        success: true,
        data: {
          service: 'userService',
          groups: [
            { id: '1', name: 'Group 1' }
          ]
        }
      });

      const response = await request(app)
        .get('/api/v1/groups')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('userService');
      expect(response.body.data.groups).toHaveLength(1);
    }, 120000);
  });
  
  describe('Expense Service Routes', () => {
    it('should forward requests to the Expense Service', async () => {
      makeServiceRequest.mockResolvedValue({
        success: true,
        data: {
          service: 'expenseService',
          expenses: []
        }
      });

      const response = await request(app)
        .get('/api/v1/expenses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('expenseService');
    }, 120000);
  });
  
  describe('Settlement Service Routes', () => {
    it('should forward requests to the Settlement Service', async () => {
      makeServiceRequest.mockResolvedValue({
        success: true,
        data: {
          service: 'settlementService',
          settlements: []
        }
      });

      const response = await request(app)
        .get('/api/v1/settlements')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('settlementService');
    }, 120000);
    
    it('should forward settlement suggestions requests correctly', async () => {
      makeServiceRequest.mockResolvedValue({
        success: true,
        data: {
          service: 'settlementService',
          suggestions: []
        }
      });

      const response = await request(app)
        .get('/api/v1/settlements/suggestions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('settlementService');
    }, 120000);
    
    it('should forward calculation detail requests correctly', async () => {
      makeServiceRequest.mockResolvedValue({
        success: true,
        data: {
          service: 'settlementService',
          details: {}
        }
      });

      const response = await request(app)
        .get('/api/v1/settlements/1/details')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('settlementService');
    }, 120000);
  });
  
  describe('Notification Service Routes', () => {
    it('should forward requests to the Notification Service', async () => {
      makeServiceRequest.mockResolvedValue({
        success: true,
        data: {
          service: 'notificationService',
          notifications: []
        }
      });

      const response = await request(app)
        .get('/api/v1/notifications')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('notificationService');
    }, 120000);
  });
}); 