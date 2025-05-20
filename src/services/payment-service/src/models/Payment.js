import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'bank_transfer']
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  stripeCustomerId: {
    type: String,
    sparse: true
  },
  stripeTransferId: {
    type: String,
    sparse: true
  },
  error: {
    code: String,
    message: String,
    timestamp: Date
  },
  metadata: {
    type: Map,
    of: String
  },
  refundDetails: {
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed']
    },
    stripeRefundId: String,
    timestamp: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ userId: 1, settlementId: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });
paymentSchema.index({ stripeCustomerId: 1 }, { sparse: true });
paymentSchema.index({ status: 1, createdAt: 1 });

// Methods
paymentSchema.methods.updateStatus = async function(status, error = null) {
  this.status = status;
  if (error) {
    this.error = {
      code: error.code,
      message: error.message,
      timestamp: new Date()
    };
  }
  return this.save();
};

paymentSchema.methods.initiateRefund = async function(amount, reason) {
  this.refundDetails = {
    amount,
    reason,
    status: 'pending',
    timestamp: new Date()
  };
  this.status = 'refunded';
  return this.save();
};

// Statics
paymentSchema.statics.findByStripePaymentIntent = function(paymentIntentId) {
  return this.findOne({ stripePaymentIntentId: paymentIntentId });
};

paymentSchema.statics.findPendingPayments = function() {
  return this.find({ status: 'pending' });
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment; 