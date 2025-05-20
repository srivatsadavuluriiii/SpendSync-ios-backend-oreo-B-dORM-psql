import mongoose from 'mongoose';
import Decimal from 'decimal.js';

// First, create the WalletLog model
const walletLogSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['FREEZE', 'UNFREEZE', 'LIMIT_CHANGE', 'STATUS_CHANGE'],
    required: true
  },
  reason: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

const WalletLog = mongoose.model('WalletLog', walletLogSchema);

// Then, create the Wallet model
const walletSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: String,
    required: true,
    default: '0',
    get: function(value) {
      return new Decimal(value || '0');
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
  status: {
    type: String,
    enum: ['ACTIVE', 'FROZEN', 'CLOSED'],
    default: 'ACTIVE'
  },
  limits: {
    daily: {
      type: Number,
      default: 1000
    },
    monthly: {
      type: Number,
      default: 5000
    }
  },
  usage: {
    daily: {
      amount: {
        type: Number,
        default: 0
      },
      lastReset: {
        type: Date,
        default: Date.now
      }
    },
    monthly: {
      amount: {
        type: Number,
        default: 0
      },
      lastReset: {
        type: Date,
        default: Date.now
      }
    }
  },
  linkedAccounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  }],
  defaultFundingSource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  }
}, {
  timestamps: true,
  toJSON: { getters: true }
});

// Indexes
walletSchema.index({ userId: 1, status: 1 });
walletSchema.index({ 'usage.daily.lastReset': 1 });
walletSchema.index({ 'usage.monthly.lastReset': 1 });

// Methods
walletSchema.methods.credit = async function(amount, description = '') {
  const newBalance = new Decimal(this.balance).plus(amount);
  this.balance = newBalance.toString();
  await this.save();

  // Create transaction record
  await this.model('Transaction').create({
    walletId: this._id,
    type: 'CREDIT',
    amount: amount.toString(),
    balance: this.balance,
    description,
    sourceType: 'EXTERNAL',
    destinationType: 'WALLET',
    destinationId: this._id.toString()
  });

  return this.balance;
};

walletSchema.methods.debit = async function(amount, description = '') {
  const currentBalance = new Decimal(this.balance);
  const debitAmount = new Decimal(amount);

  if (currentBalance.lessThan(debitAmount)) {
    throw new Error('Insufficient funds');
  }

  // Check limits
  await this.checkAndUpdateLimits(debitAmount);

  const newBalance = currentBalance.minus(debitAmount);
  this.balance = newBalance.toString();
  await this.save();

  // Create transaction record
  await this.model('Transaction').create({
    walletId: this._id,
    type: 'DEBIT',
    amount: amount.toString(),
    balance: this.balance,
    description,
    sourceType: 'WALLET',
    sourceId: this._id.toString(),
    destinationType: 'EXTERNAL'
  });

  return this.balance;
};

walletSchema.methods.checkAndUpdateLimits = async function(amount) {
  const now = new Date();
  
  // Reset daily limit if needed
  if (this.usage.daily.lastReset.getDate() !== now.getDate()) {
    this.usage.daily = {
      amount: 0,
      lastReset: now
    };
  }

  // Reset monthly limit if needed
  if (this.usage.monthly.lastReset.getMonth() !== now.getMonth()) {
    this.usage.monthly = {
      amount: 0,
      lastReset: now
    };
  }

  // Check limits
  const newDailyAmount = this.usage.daily.amount + Number(amount);
  const newMonthlyAmount = this.usage.monthly.amount + Number(amount);

  // Check monthly limit first - it's more restrictive
  if (newMonthlyAmount > this.limits.monthly) {
    throw new Error('Monthly limit exceeded');
  }

  // Then check daily limit
  if (newDailyAmount > this.limits.daily) {
    throw new Error('Daily limit exceeded');
  }

  // Update usage
  this.usage.daily.amount = newDailyAmount;
  this.usage.monthly.amount = newMonthlyAmount;
};

walletSchema.methods.freeze = async function(reason = '') {
  this.status = 'FROZEN';
  await this.save();

  // Log the action
  await WalletLog.create({
    walletId: this._id,
    action: 'FREEZE',
    reason
  });
};

walletSchema.methods.unfreeze = async function(reason = '') {
  this.status = 'ACTIVE';
  await this.save();

  // Log the action
  await WalletLog.create({
    walletId: this._id,
    action: 'UNFREEZE',
    reason
  });
};

// Statics
walletSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId, status: 'ACTIVE' });
};

walletSchema.statics.createWallet = async function(userId, currency = 'USD') {
  return this.create({
    userId,
    currency,
    balance: '0'
  });
};

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet; 