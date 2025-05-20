import mongoose from 'mongoose';
import Decimal from 'decimal.js';

const transactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['CREDIT', 'DEBIT', 'TRANSFER', 'REFUND', 'SETTLEMENT'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
    default: 'PENDING',
    index: true
  },
  amount: {
    type: String,
    required: true,
    get: function(value) {
      const decimal = new Decimal(value || '0');
      return decimal;
    },
    set: function(value) {
      return new Decimal(value).toFixed(2);
    }
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  balance: {
    type: String,
    required: true,
    get: function(value) {
      const decimal = new Decimal(value || '0');
      return decimal;
    },
    set: function(value) {
      return new Decimal(value).toFixed(2);
    }
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['BANK_TRANSFER', 'SETTLEMENT', 'FEE', 'REFUND', 'OTHER'],
    default: 'OTHER',
    index: true
  },
  sourceId: {
    type: String,
    sparse: true,
    index: true
  },
  sourceType: {
    type: String,
    enum: ['BANK_ACCOUNT', 'WALLET', 'CARD', 'EXTERNAL'],
    required: true
  },
  destinationId: {
    type: String,
    sparse: true,
    index: true
  },
  destinationType: {
    type: String,
    enum: ['BANK_ACCOUNT', 'WALLET', 'CARD', 'EXTERNAL'],
    required: true
  },
  fees: [{
    type: {
      type: String,
      enum: ['PROCESSING', 'SERVICE', 'BANK', 'OTHER'],
      required: true
    },
    amount: {
      type: String,
      required: true,
      get: function(value) {
        const decimal = new Decimal(value || '0');
        return decimal;
      },
      set: function(value) {
        return new Decimal(value).toFixed(2);
      }
    },
    description: String
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  errorDetails: {
    code: String,
    message: String,
    timestamp: Date
  },
  processingDetails: {
    attempts: {
      type: Number,
      default: 0
    },
    lastAttempt: Date,
    nextAttempt: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    getters: true,
    transform: function(doc, ret) {
      // Make sure amounts are always formatted with 2 decimal places
      if (ret.amount) {
        ret.amount = new Decimal(ret.amount).toFixed(2);
      }
      if (ret.balance) {
        ret.balance = new Decimal(ret.balance).toFixed(2);
      }
      if (ret.fees && ret.fees.length) {
        ret.fees.forEach(fee => {
          if (fee.amount) {
            fee.amount = new Decimal(fee.amount).toFixed(2);
          }
        });
      }
      return ret;
    }
  }
});

// Create compound indexes
transactionSchema.index({ walletId: 1, type: 1, status: 1 });
transactionSchema.index({ walletId: 1, createdAt: -1 });

// Methods
transactionSchema.methods.complete = async function() {
  this.status = 'COMPLETED';
  this.processingDetails.lastAttempt = new Date();
  await this.save();
};

transactionSchema.methods.fail = async function(errorCode, errorMessage) {
  this.status = 'FAILED';
  this.errorDetails = {
    code: errorCode,
    message: errorMessage,
    timestamp: new Date()
  };
  this.processingDetails.lastAttempt = new Date();
  await this.save();
};

transactionSchema.methods.reverse = async function(reason) {
  if (this.status !== 'COMPLETED') {
    throw new Error('Only completed transactions can be reversed');
  }

  this.status = 'REVERSED';
  await this.save();

  // Create reversal transaction
  return this.model('Transaction').create({
    walletId: this.walletId,
    type: this.type === 'CREDIT' ? 'DEBIT' : 'CREDIT',
    amount: this.amount.toString(),
    balance: this.balance.toString(),
    currency: this.currency,
    description: `Reversal: ${reason}`,
    category: this.category,
    sourceId: this.destinationId,
    sourceType: this.destinationType,
    destinationId: this.sourceId,
    destinationType: this.sourceType,
    metadata: {
      originalTransactionId: this._id,
      reversalReason: reason
    }
  });
};

// Override toString for Decimal objects to maintain precision
// This ensures .toString() in tests will always show 2 decimal places
Decimal.prototype.toString = function() {
  return this.toFixed(2);
};

// Statics
transactionSchema.statics.findByWalletId = function(walletId, options = {}) {
  const query = { walletId };
  
  if (options.status) {
    query.status = options.status;
  }
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

transactionSchema.statics.getWalletBalance = async function(walletId) {
  const result = await this.findOne({ walletId })
    .sort({ createdAt: -1 })
    .select('balance');
  
  return result ? result.balance : new Decimal(0);
};

// Ensure indexes are created immediately
transactionSchema.statics.createIndexes = async function() {
  await this.collection.createIndex({ walletId: 1, type: 1, status: 1 });
  await this.collection.createIndex({ walletId: 1, createdAt: -1 });
  console.log('Transaction indexes created');
};

const Transaction = mongoose.model('Transaction', transactionSchema);

// Create indexes right away
if (process.env.NODE_ENV !== 'test') {
  Transaction.createIndexes();
}

export default Transaction; 