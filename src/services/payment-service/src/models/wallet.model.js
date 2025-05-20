import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    minlength: 3,
    maxlength: 3,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['active', 'frozen', 'closed'],
    default: 'active'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
walletSchema.index({ userId: 1, status: 1 });
walletSchema.index({ balance: 1 });

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet; 