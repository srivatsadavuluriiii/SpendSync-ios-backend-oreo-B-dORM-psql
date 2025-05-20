import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/index.js';
import AnalyticsEvent from '../src/models/AnalyticsEvent.js';

describe('Predictions Endpoints', () => {
  beforeEach(async () => {
    await AnalyticsEvent.deleteMany({});
  });

  describe('GET /predictions', () => {
    it('should return 401 without user ID', async () => {
      const response = await request(app)
        .get('/predictions')
        .expect(401);

      expect(response.body.error).toBe('User ID is required');
    });

    it('should return predictions with confidence intervals', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 150, category: 'groceries', timestamp: new Date() },
        { amount: 200, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/predictions')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('predictions');
      expect(response.body.predictions).toHaveProperty('amount');
      expect(response.body.predictions).toHaveProperty('confidenceInterval');
    });

    it('should respect the months parameter', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 150, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/predictions')
        .query({ 
          userId: userId.toString(),
          months: 3
        })
        .expect(200);

      expect(response.body.predictions).toHaveProperty('amount');
      expect(response.body.predictions).toHaveProperty('confidenceInterval');
    });
  });

  describe('GET /predictions/by-category', () => {
    it('should return category-specific predictions', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 150, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/predictions/by-category')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(response.body.categories).toHaveProperty('groceries');
      expect(response.body.categories.groceries).toHaveProperty('prediction');
    });

    it('should filter by specific category', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 150, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/predictions/by-category')
        .query({ 
          userId: userId.toString(),
          category: 'groceries'
        })
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(response.body.categories).toHaveProperty('groceries');
      expect(response.body.categories.groceries).toHaveProperty('prediction');
    });
  });

  describe('GET /predictions/seasonal', () => {
    it('should identify seasonal patterns', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 150, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/predictions/seasonal')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('patterns');
      expect(Array.isArray(response.body.patterns)).toBe(true);
    });

    it('should handle empty data gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get('/predictions/seasonal')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body.patterns).toEqual([]);
    });
  });

  describe('Input Validation', () => {
    it('should validate months parameter', async () => {
      const userId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get('/predictions')
        .query({ 
          userId: userId.toString(),
          months: 'invalid'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid months parameter');
    });

    it('should limit months to 12', async () => {
      const userId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get('/predictions')
        .query({ 
          userId: userId.toString(),
          months: 13
        })
        .expect(400);

      expect(response.body.error).toBe('Months parameter must be between 1 and 12');
    });
  });
}); 