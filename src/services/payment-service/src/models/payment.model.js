import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
    index: true
  },
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 3,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true,
    unique: true
  },
  error: {
    type: String
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ senderId: 1, status: 1 });
paymentSchema.index({ recipientId: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment; 
 