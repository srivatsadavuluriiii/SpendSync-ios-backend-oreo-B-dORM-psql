import { validate, ValidationError } from '../../src/middleware/validation/validator.js';
import { schemas } from '../../src/middleware/validation/schemas.js';

describe('Validation Middleware Tests', () => {
  describe('Request Validation', () => {
    test('should validate valid spending query', async () => {
      const req = {
        query: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z',
          category: 'food',
          limit: 10,
          page: 1
        },
        headers: {
          'user-id': 'test-user-123'
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate('spending', 'query');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.startDate).toBeDefined();
      expect(req.query.endDate).toBeDefined();
    });

    test('should reject invalid date range', async () => {
      const req = {
        query: {
          startDate: '2024-02-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z', // Before start date
          category: 'food'
        },
        headers: {
          'user-id': 'test-user-123'
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate('spending', 'query');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].details[0].field).toBe('endDate');
    });

    test('should validate valid insights query', async () => {
      const req = {
        query: {
          timeframe: 6,
          categories: ['food', 'transport']
        },
        headers: {
          'user-id': 'test-user-123'
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate('insights', 'query');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.timeframe).toBe(6);
      expect(req.query.categories).toEqual(['food', 'transport']);
    });

    test('should reject invalid category format', async () => {
      const req = {
        query: {
          category: 'invalid@category' // Invalid format
        },
        headers: {
          'user-id': 'test-user-123'
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate('spending', 'query');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].details[0].field).toBe('category');
    });
  });

  describe('Analytics Event Validation', () => {
    test('should validate valid analytics event', async () => {
      const req = {
        body: {
          userId: 'test-user-123',
          category: 'food',
          amount: 50.25,
          timestamp: new Date().toISOString(),
          description: 'Lunch',
          metadata: { location: 'Restaurant' }
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate('analyticsEvent', 'body');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.amount).toBe(50.25);
    });

    test('should reject negative amount', async () => {
      const req = {
        body: {
          userId: 'test-user-123',
          category: 'food',
          amount: -50, // Negative amount
          timestamp: new Date().toISOString()
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate('analyticsEvent', 'body');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].details[0].field).toBe('amount');
    });
  });

  describe('Batch Analytics Validation', () => {
    test('should validate valid batch request', async () => {
      const req = {
        body: {
          events: Array(5).fill().map(() => ({
            userId: 'test-user-123',
            category: 'food',
            amount: 50,
            timestamp: new Date().toISOString(),
            description: 'Test expense'
          }))
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate('batchAnalytics', 'body');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.events).toHaveLength(5);
    });

    test('should reject oversized batch', async () => {
      const req = {
        body: {
          events: Array(1001).fill().map(() => ({ // Exceeds max batch size
            userId: 'test-user-123',
            category: 'food',
            amount: 50,
            timestamp: new Date().toISOString()
          }))
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate('batchAnalytics', 'body');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].details[0].field).toBe('events');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing schema gracefully', async () => {
      const req = { body: {} };
      const res = {};
      const next = jest.fn();

      const middleware = validate('nonexistentSchema', 'body');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Schema nonexistentSchema not found');
    });

    test('should handle missing property schema gracefully', async () => {
      const req = { body: {} };
      const res = {};
      const next = jest.fn();

      // Create temporary schema without body property
      const tempSchema = { query: schemas.spending.query };
      schemas.temp = tempSchema;

      const middleware = validate('temp', 'body');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Schema for body not found');

      // Cleanup
      delete schemas.temp;
    });
  });
}); 