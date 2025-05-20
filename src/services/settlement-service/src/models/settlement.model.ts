/**
 * Settlement Model
 * 
 * Mongoose model for settlements between users
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettlement extends Document {
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  groupId: string;
  notes?: string;
  createdBy: string;
  status: string;
  paymentStatus?: string;
  paymentDetails?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const settlementSchema = new Schema({
  payerId: {
    type: String,
    required: true,
    index: true
  },
  receiverId: {
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
    uppercase: true,
    trim: true
  },
  groupId: {
    type: String,
    required: true,
    index: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  paymentDetails: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
settlementSchema.index({ createdAt: -1 });
settlementSchema.index({ updatedAt: -1 });
settlementSchema.index({ groupId: 1, status: 1 });
settlementSchema.index({ payerId: 1, status: 1 });
settlementSchema.index({ receiverId: 1, status: 1 });

// Create and export the model
const Settlement: Model<ISettlement> = mongoose.model<ISettlement>('Settlement', settlementSchema);
export { Settlement as default }; 