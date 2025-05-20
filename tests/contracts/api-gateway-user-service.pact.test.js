const { Pact, Matchers } = require('@pact-foundation/pact');
const path = require('path');
const { like, eachLike } = Matchers;

// Mock the config module
jest.mock('../../src/api-gateway/config', () => ({
  serviceUrls: {
    userService: 'http://localhost:3001',
    expenseService: 'http://localhost:3002',
    settlementService: 'http://localhost:3003',
    notificationService: 'http://localhost:3004'
  }
}));

// Import the service proxy
const { makeServiceRequest } = require('../../src/api-gateway/utils/service-proxy');

// Configure the Pact provider
const pactProvider = new Pact({
  consumer: 'ApiGateway',
  provider: 'UserService',
  port: 1234,
  log: path.resolve(process.cwd(), 'logs', 'pact-api-gateway-user-service.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'INFO',
  spec: 2
});

describe('Pact between ApiGateway and UserService', () => {
  beforeAll(() => pactProvider.setup());
  afterAll(() => pactProvider.finalize());
  afterEach(() => pactProvider.verify());

  describe('when a GET request is made for an existing user', () => {
    beforeEach(() => {
      return pactProvider.addInteraction({
        state: 'a user with ID 1 exists',
        uponReceiving: 'a request to get user details',
        withRequest: {
          method: 'GET',
          path: '/api/users/1',
          headers: {
            Accept: 'application/json'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: like({
            success: true,
            data: {
              service: 'userService',
              user: {
                id: '1',
                username: 'testuser',
                email: 'testuser@example.com',
                createdAt: like('2024-01-01T00:00:00.000Z')
              }
            }
          })
        }
      });
    });

    it('returns the user successfully', async () => {
      const response = await makeServiceRequest(
        'userService',
        'GET',
        '/api/users/1',
        null,
        { Accept: 'application/json' },
        `http://localhost:${pactProvider.opts.port}`
      );

      expect(response.success).toBe(true);
      expect(response.data.service).toBe('userService');
      expect(response.data.user.id).toBe('1');
      expect(response.data.user.username).toBe('testuser');
    });
  });

  describe('when a GET request is made for a non-existent user', () => {
    beforeEach(() => {
      return pactProvider.addInteraction({
        state: 'a user with ID 999 does not exist',
        uponReceiving: 'a request to get non-existent user details',
        withRequest: {
          method: 'GET',
          path: '/api/users/999',
          headers: {
            Accept: 'application/json'
          }
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          },
          body: like({
            success: false,
            data: {
              service: 'userService',
              error: {
                code: 'USER_NOT_FOUND',
                message: like('User not found')
              }
            }
          })
        }
      });
    });

    it('returns a 404 error', async () => {
      try {
        await makeServiceRequest(
          'userService',
          'GET',
          '/api/users/999',
          null,
          { Accept: 'application/json' },
          `http://localhost:${pactProvider.opts.port}`
        );
        fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.status).toBe(404);
        expect(error.data.data.service).toBe('userService');
        expect(error.data.data.error.code).toBe('USER_NOT_FOUND');
      }
    });
  });
}); 