/**
 * Settlement Model
 * 
 * Defines the data structure for settlement records
 * 
 * @swagger
 * components:
 *   schemas:
 *     SettlementModel:
 *       type: object
 *       required:
 *         - payerId
 *         - receiverId
 *         - amount
 *         - currency
 *         - groupId
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *         payerId:
 *           type: string
 *           description: User ID of the payer
 *         receiverId:
 *           type: string
 *           description: User ID of the receiver
 *         amount:
 *           type: number
 *           description: Amount to be settled
 *         currency:
 *           type: string
 *           description: Currency code (e.g., USD, EUR)
 *         groupId:
 *           type: string
 *           description: Group ID the settlement belongs to
 *         status:
 *           type: string
 *           enum: [pending, completed, cancelled, processing, failed]
 *           default: pending
 *           description: Status of the settlement
 *         paymentStatus:
 *           type: string
 *           enum: [not_started, awaiting_payment, processing, succeeded, failed, refunded]
 *           default: not_started
 *           description: Status of the payment process
 *         paymentMethod:
 *           type: string
 *           enum: [card, bank_transfer, cash, app_balance, other]
 *           description: Method used for payment
 *         paymentIntentId:
 *           type: string
 *           description: ID of the payment intent from the payment provider
 *         paymentError:
 *           type: string
 *           description: Error message if payment failed
 *         paymentMetadata:
 *           type: object
 *           description: Additional payment metadata from the processor
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the settlement was completed
 *         processedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the payment was processed
 *         notes:
 *           type: string
 *           description: Optional notes about the settlement
 *         createdBy:
 *           type: string
 *           description: User ID of the person who created the settlement
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the settlement was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the settlement was last updated
 */

const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  payerId: {
    type: String,
    required: true
  },
  receiverId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  groupId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'processing', 'failed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['not_started', 'awaiting_payment', 'processing', 'succeeded', 'failed', 'refunded'],
    default: 'not_started'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'cash', 'app_balance', 'other'],
  },
  paymentIntentId: {
    type: String
  },
  paymentError: {
    type: String
  },
  paymentMetadata: {
    type: mongoose.Schema.Types.Mixed
  },
  completedAt: {
    type: Date
  },
  processedAt: {
    type: Date
  },
  notes: {
    type: String
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
SettlementSchema.index({ payerId: 1 });
SettlementSchema.index({ receiverId: 1 });
SettlementSchema.index({ groupId: 1 });
SettlementSchema.index({ status: 1 });
SettlementSchema.index({ paymentStatus: 1 });
SettlementSchema.index({ paymentIntentId: 1 });
SettlementSchema.index({ createdAt: -1 });

// Define a toJSON method to customize the output
SettlementSchema.methods.toJSON = function() {
  const settlement = this.toObject();
  
  // Convert _id to id for API consistency
  settlement.id = settlement._id.toString();
  delete settlement._id;
  delete settlement.__v;
  
  return settlement;
};

const Settlement = mongoose.model('Settlement', SettlementSchema);

module.exports = Settlement; 