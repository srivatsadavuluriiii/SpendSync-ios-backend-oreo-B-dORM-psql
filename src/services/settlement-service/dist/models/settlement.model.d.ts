/**
 * Settlement Model
 *
 * Mongoose model for settlements between users
 */
import { Document, Model } from 'mongoose';
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
declare const Settlement: Model<ISettlement>;
export { Settlement as default };
