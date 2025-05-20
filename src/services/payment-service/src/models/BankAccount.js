import mongoose from 'mongoose';
import crypto from 'crypto-js';

const bankAccountSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  institutionName: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['CHECKING', 'SAVINGS', 'CREDIT'],
    required: true
  },
  accountNumber: {
    type: String,
    required: true,
    set: function(value) {
      if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY not set');
      }
      return crypto.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString();
    },
    get: function(value) {
      if (!value || !process.env.ENCRYPTION_KEY) {
        return null;
      }
      try {
        const bytes = crypto.AES.decrypt(value, process.env.ENCRYPTION_KEY);
        return bytes.toString(crypto.enc.Utf8);
      } catch (error) {
        return null;
      }
    }
  },
  routingNumber: {
    type: String,
    required: true,
    set: function(value) {
      if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY not set');
      }
      return crypto.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString();
    },
    get: function(value) {
      if (!value || !process.env.ENCRYPTION_KEY) {
        return null;
      }
      try {
        const bytes = crypto.AES.decrypt(value, process.env.ENCRYPTION_KEY);
        return bytes.toString(crypto.enc.Utf8);
      } catch (error) {
        return null;
      }
    }
  },
  plaidAccessToken: {
    type: String,
    required: false
  },
  plaidItemId: {
    type: String,
    required: false,
    sparse: true,
    index: true
  },
  plaidAccountId: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PENDING_VERIFICATION', 'VERIFICATION_FAILED', 'DISABLED'],
    default: 'PENDING_VERIFICATION'
  },
  balance: {
    available: {
      type: Number,
      default: 0
    },
    current: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  verificationAttempts: {
    type: Number,
    default: 0
  },
  lastVerificationAttempt: {
    type: Date
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.plaidAccessToken;
      delete ret.plaidItemId;
      return ret;
    }
  }
});

// Indexes
bankAccountSchema.index({ userId: 1, status: 1 });

// Methods
bankAccountSchema.methods.updateBalance = async function(balanceData) {
  // Check if the balance data is an object with available and current properties
  if (balanceData && typeof balanceData === 'object' && 'available' in balanceData && 'current' in balanceData) {
    this.balance.available = balanceData.available;
    this.balance.current = balanceData.current;
    this.balance.lastUpdated = new Date();
  } else {
    // For backward compatibility with the old method signature
    const availableBalance = balanceData;
    const currentBalance = arguments[1];
    
    this.balance.available = availableBalance;
    this.balance.current = currentBalance;
    this.balance.lastUpdated = new Date();
  }
  
  await this.save();
  return this;
};

bankAccountSchema.methods.verify = async function() {
  this.verificationAttempts += 1;
  this.lastVerificationAttempt = new Date();
  
  if (this.verificationAttempts >= 3) {
    this.status = 'VERIFICATION_FAILED';
  }
  
  await this.save();
  return this.status;
};

// Added method for tests
bankAccountSchema.methods.trackVerificationAttempt = async function(success) {
  this.verificationAttempts += 1;
  this.lastVerificationAttempt = new Date();
  
  if (success) {
    this.status = 'ACTIVE';
  } else if (this.verificationAttempts >= 3) {
    this.status = 'VERIFICATION_FAILED';
  }
  
  await this.save();
  return this;
};

// Statics
bankAccountSchema.statics.findByUserId = function(userId) {
  return this.find({ userId, status: 'ACTIVE' });
};

// Added method for tests
bankAccountSchema.statics.findActiveByUserId = function(userId) {
  return this.find({ userId, status: 'ACTIVE' });
};

bankAccountSchema.statics.findByPlaidItemId = function(plaidItemId) {
  return this.findOne({ plaidItemId });
};

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

export default BankAccount; 