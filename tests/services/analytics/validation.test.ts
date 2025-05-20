import { analyticsSchemas } from '../../../src/services/analytics/schemas';
import { sanitizeMongoQuery, sanitizeAggregatePipeline } from '../../../src/middleware/validation';

describe('Analytics Validation', () => {
  describe('Event Tracking Schema', () => {
    const validEvent = {
      userId: 'user123',
      timestamp: new Date().toISOString(),
      eventName: 'test_event',
      metadata: { key: 'value' },
      deviceInfo: {
        platform: 'ios',
        version: '1.0.0',
        model: 'iPhone 12',
        osVersion: '15.0'
      }
    };

    it('should validate correct event data', () => {
      const { error } = analyticsSchemas.trackEvent.body.validate(validEvent);
      expect(error).toBeUndefined();
    });

    it('should reject invalid userId', () => {
      const invalidEvent = { ...validEvent, userId: '' };
      const { error } = analyticsSchemas.trackEvent.body.validate(invalidEvent);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('userId');
    });

    it('should reject invalid timestamp', () => {
      const invalidEvent = { ...validEvent, timestamp: 'invalid-date' };
      const { error } = analyticsSchemas.trackEvent.body.validate(invalidEvent);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('timestamp');
    });

    it('should reject oversized metadata', () => {
      const largeMetadata = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = 'x'.repeat(1000);
      }
      const invalidEvent = { ...validEvent, metadata: largeMetadata };
      const { error } = analyticsSchemas.trackEvent.body.validate(invalidEvent);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('metadata');
    });
  });

  describe('Batch Events Schema', () => {
    const validEvent = {
      userId: 'user123',
      timestamp: new Date().toISOString(),
      eventName: 'test_event',
      metadata: { key: 'value' },
      deviceInfo: {
        platform: 'ios',
        version: '1.0.0',
        model: 'iPhone 12',
        osVersion: '15.0'
      }
    };

    it('should validate correct batch data', () => {
      const batch = { events: [validEvent, validEvent] };
      const { error } = analyticsSchemas.batchEvents.body.validate(batch);
      expect(error).toBeUndefined();
    });

    it('should reject empty batch', () => {
      const batch = { events: [] };
      const { error } = analyticsSchemas.batchEvents.body.validate(batch);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('events');
    });

    it('should reject oversized batch', () => {
      const batch = { events: Array(101).fill(validEvent) };
      const { error } = analyticsSchemas.batchEvents.body.validate(batch);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('events');
    });
  });

  describe('Query Analytics Schema', () => {
    const validQuery = {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-02T00:00:00Z',
      userId: 'user123',
      eventName: 'test_event',
      platform: 'ios',
      limit: 100,
      offset: 0,
      sort: 'desc'
    };

    it('should validate correct query parameters', () => {
      const { error } = analyticsSchemas.queryAnalytics.query.validate(validQuery);
      expect(error).toBeUndefined();
    });

    it('should reject invalid date range', () => {
      const invalidQuery = {
        ...validQuery,
        startDate: '2024-01-02T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z'
      };
      const { error } = analyticsSchemas.queryAnalytics.query.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error?.message).toContain('date');
    });

    it('should reject date range exceeding 30 days', () => {
      const invalidQuery = {
        ...validQuery,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z'
      };
      const { error } = analyticsSchemas.queryAnalytics.query.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error?.message).toContain('range');
    });
  });

  describe('MongoDB Sanitization', () => {
    it('should remove MongoDB operators from query', () => {
      const query = {
        userId: 'user123',
        '$where': 'malicious code',
        nested: {
          '$regex': 'malicious.*',
          safe: 'value'
        }
      };
      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized).toEqual({
        userId: 'user123',
        nested: {
          safe: 'value'
        }
      });
    });

    it('should sanitize arrays', () => {
      const query = {
        items: [
          { '$where': 'malicious', safe: 'value' },
          { key: 'safe' }
        ]
      };
      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized).toEqual({
        items: [
          { safe: 'value' },
          { key: 'safe' }
        ]
      });
    });

    it('should handle null and undefined values', () => {
      const query = {
        null: null,
        undefined: undefined,
        nested: {
          null: null,
          undefined: undefined
        }
      };
      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized).toEqual({
        null: null,
        undefined: undefined,
        nested: {
          null: null,
          undefined: undefined
        }
      });
    });
  });

  describe('Aggregation Pipeline Sanitization', () => {
    it('should allow valid aggregation operators', () => {
      const pipeline = [
        { $match: { userId: 'user123' } },
        { $group: { _id: '$eventName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ];
      const sanitized = sanitizeAggregatePipeline(pipeline);
      expect(sanitized).toEqual(pipeline);
    });

    it('should remove invalid operators', () => {
      const pipeline = [
        { $match: { userId: 'user123' } },
        { $invalidOp: { field: 'value' } },
        { $sort: { count: -1 } }
      ];
      const sanitized = sanitizeAggregatePipeline(pipeline);
      expect(sanitized).toEqual([
        { $match: { userId: 'user123' } },
        {},
        { $sort: { count: -1 } }
      ]);
    });
  });
}); 