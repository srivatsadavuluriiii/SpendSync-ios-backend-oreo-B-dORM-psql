import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as paymentService from '../../src/services/payment.service.js';
import Payment from '../../src/models/payment.model.js';
import StripeService from '../../src/integrations/stripe.service.js';
import { NotFoundError, ValidationError } from '../../src/utils/errors.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Payment.deleteMany({});
});

describe('Payment Service', () => {
  describe('getAllPayments', () => {
    it('should return all payments for a user', async () => {
      const userId = 'user123';
      const payments = [
        { senderId: userId, recipientId: 'user456', amount: 100, currency: 'USD', status: 'completed' },
        { senderId: userId, recipientId: 'user789', amount: 200, currency: 'USD', status: 'pending' }
      ];

      await Payment.insertMany(payments);

      const result = await paymentService.getAllPayments(userId);
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(200); // Most recent first
      expect(result[1].amount).toBe(100);
    });

    it('should return empty array when no payments exist', async () => {
      const result = await paymentService.getAllPayments('user123');
      expect(result).toHaveLength(0);
    });
  });

  describe('getPaymentById', () => {
    it('should return payment by ID', async () => {
      const payment = await Payment.create({
        senderId: 'user123',
        recipientId: 'user456',
        amount: 100,
        currency: 'USD',
        status: 'completed'
      });

      const result = await paymentService.getPaymentById(payment._id);
      expect(result.amount).toBe(100);
      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundError when payment does not exist', async () => {
      await expect(paymentService.getPaymentById('nonexistentid'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const payment = await Payment.create({
        senderId: 'user123',
        recipientId: 'user456',
        amount: 100,
        currency: 'USD',
        status: 'pending'
      });

      const result = await paymentService.updatePaymentStatus(payment._id, 'completed');
      expect(result.status).toBe('completed');
    });

    it('should throw ValidationError for invalid status', async () => {
      const payment = await Payment.create({
        senderId: 'user123',
        recipientId: 'user456',
        amount: 100,
        currency: 'USD',
        status: 'pending'
      });

      await expect(paymentService.updatePaymentStatus(payment._id, 'invalid'))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a pending payment', async () => {
      const payment = await Payment.create({
        senderId: 'user123',
        recipientId: 'user456',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        stripePaymentIntentId: 'pi_123'
      });

      jest.spyOn(StripeService, 'cancelPaymentIntent').mockResolvedValue({});

      const result = await paymentService.cancelPayment(payment._id);
      expect(result.status).toBe('cancelled');
      expect(StripeService.cancelPaymentIntent).toHaveBeenCalledWith('pi_123');
    });

    it('should throw ValidationError when cancelling completed payment', async () => {
      const payment = await Payment.create({
        senderId: 'user123',
        recipientId: 'user456',
        amount: 100,
        currency: 'USD',
        status: 'completed'
      });

      await expect(paymentService.cancelPayment(payment._id))
        .rejects
        .toThrow(ValidationError);
    });
  });
}); 