"use strict"; /**
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
 *           enum: [pending, completed, cancelled]
 *           default: pending
 *           description: Status of the settlement
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the settlement was completed
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
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  completedAt: {
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
SettlementSchema.index({ createdAt: -1 });

// Define a toJSON method to customize the output
SettlementSchema.methods.toJSON = function () {
  const settlement = this.toObject();

  // Convert _id to id for API consistency
  settlement.id = settlement._id.toString();
  delete settlement._id;
  delete settlement.__v;

  return settlement;
};

const Settlement = mongoose.model('Settlement', SettlementSchema);

module.exports = Settlement;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJtb25nb29zZSIsInJlcXVpcmUiLCJTZXR0bGVtZW50U2NoZW1hIiwiU2NoZW1hIiwicGF5ZXJJZCIsInR5cGUiLCJTdHJpbmciLCJyZXF1aXJlZCIsInJlY2VpdmVySWQiLCJhbW91bnQiLCJOdW1iZXIiLCJtaW4iLCJjdXJyZW5jeSIsImRlZmF1bHQiLCJncm91cElkIiwic3RhdHVzIiwiZW51bSIsImNvbXBsZXRlZEF0IiwiRGF0ZSIsIm5vdGVzIiwiY3JlYXRlZEJ5IiwidGltZXN0YW1wcyIsImluZGV4IiwiY3JlYXRlZEF0IiwibWV0aG9kcyIsInRvSlNPTiIsInNldHRsZW1lbnQiLCJ0b09iamVjdCIsImlkIiwiX2lkIiwidG9TdHJpbmciLCJfX3YiLCJTZXR0bGVtZW50IiwibW9kZWwiLCJtb2R1bGUiLCJleHBvcnRzIl0sInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVscy9zZXR0bGVtZW50Lm1vZGVsLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogU2V0dGxlbWVudCBNb2RlbFxuICogXG4gKiBEZWZpbmVzIHRoZSBkYXRhIHN0cnVjdHVyZSBmb3Igc2V0dGxlbWVudCByZWNvcmRzXG4gKiBcbiAqIEBzd2FnZ2VyXG4gKiBjb21wb25lbnRzOlxuICogICBzY2hlbWFzOlxuICogICAgIFNldHRsZW1lbnRNb2RlbDpcbiAqICAgICAgIHR5cGU6IG9iamVjdFxuICogICAgICAgcmVxdWlyZWQ6XG4gKiAgICAgICAgIC0gcGF5ZXJJZFxuICogICAgICAgICAtIHJlY2VpdmVySWRcbiAqICAgICAgICAgLSBhbW91bnRcbiAqICAgICAgICAgLSBjdXJyZW5jeVxuICogICAgICAgICAtIGdyb3VwSWRcbiAqICAgICAgICAgLSBzdGF0dXNcbiAqICAgICAgIHByb3BlcnRpZXM6XG4gKiAgICAgICAgIF9pZDpcbiAqICAgICAgICAgICB0eXBlOiBzdHJpbmdcbiAqICAgICAgICAgICBkZXNjcmlwdGlvbjogTW9uZ29EQiBPYmplY3RJZFxuICogICAgICAgICBwYXllcklkOlxuICogICAgICAgICAgIHR5cGU6IHN0cmluZ1xuICogICAgICAgICAgIGRlc2NyaXB0aW9uOiBVc2VyIElEIG9mIHRoZSBwYXllclxuICogICAgICAgICByZWNlaXZlcklkOlxuICogICAgICAgICAgIHR5cGU6IHN0cmluZ1xuICogICAgICAgICAgIGRlc2NyaXB0aW9uOiBVc2VyIElEIG9mIHRoZSByZWNlaXZlclxuICogICAgICAgICBhbW91bnQ6XG4gKiAgICAgICAgICAgdHlwZTogbnVtYmVyXG4gKiAgICAgICAgICAgZGVzY3JpcHRpb246IEFtb3VudCB0byBiZSBzZXR0bGVkXG4gKiAgICAgICAgIGN1cnJlbmN5OlxuICogICAgICAgICAgIHR5cGU6IHN0cmluZ1xuICogICAgICAgICAgIGRlc2NyaXB0aW9uOiBDdXJyZW5jeSBjb2RlIChlLmcuLCBVU0QsIEVVUilcbiAqICAgICAgICAgZ3JvdXBJZDpcbiAqICAgICAgICAgICB0eXBlOiBzdHJpbmdcbiAqICAgICAgICAgICBkZXNjcmlwdGlvbjogR3JvdXAgSUQgdGhlIHNldHRsZW1lbnQgYmVsb25ncyB0b1xuICogICAgICAgICBzdGF0dXM6XG4gKiAgICAgICAgICAgdHlwZTogc3RyaW5nXG4gKiAgICAgICAgICAgZW51bTogW3BlbmRpbmcsIGNvbXBsZXRlZCwgY2FuY2VsbGVkXVxuICogICAgICAgICAgIGRlZmF1bHQ6IHBlbmRpbmdcbiAqICAgICAgICAgICBkZXNjcmlwdGlvbjogU3RhdHVzIG9mIHRoZSBzZXR0bGVtZW50XG4gKiAgICAgICAgIGNvbXBsZXRlZEF0OlxuICogICAgICAgICAgIHR5cGU6IHN0cmluZ1xuICogICAgICAgICAgIGZvcm1hdDogZGF0ZS10aW1lXG4gKiAgICAgICAgICAgZGVzY3JpcHRpb246IERhdGUgd2hlbiB0aGUgc2V0dGxlbWVudCB3YXMgY29tcGxldGVkXG4gKiAgICAgICAgIG5vdGVzOlxuICogICAgICAgICAgIHR5cGU6IHN0cmluZ1xuICogICAgICAgICAgIGRlc2NyaXB0aW9uOiBPcHRpb25hbCBub3RlcyBhYm91dCB0aGUgc2V0dGxlbWVudFxuICogICAgICAgICBjcmVhdGVkQnk6XG4gKiAgICAgICAgICAgdHlwZTogc3RyaW5nXG4gKiAgICAgICAgICAgZGVzY3JpcHRpb246IFVzZXIgSUQgb2YgdGhlIHBlcnNvbiB3aG8gY3JlYXRlZCB0aGUgc2V0dGxlbWVudFxuICogICAgICAgICBjcmVhdGVkQXQ6XG4gKiAgICAgICAgICAgdHlwZTogc3RyaW5nXG4gKiAgICAgICAgICAgZm9ybWF0OiBkYXRlLXRpbWVcbiAqICAgICAgICAgICBkZXNjcmlwdGlvbjogRGF0ZSB3aGVuIHRoZSBzZXR0bGVtZW50IHdhcyBjcmVhdGVkXG4gKiAgICAgICAgIHVwZGF0ZWRBdDpcbiAqICAgICAgICAgICB0eXBlOiBzdHJpbmdcbiAqICAgICAgICAgICBmb3JtYXQ6IGRhdGUtdGltZVxuICogICAgICAgICAgIGRlc2NyaXB0aW9uOiBEYXRlIHdoZW4gdGhlIHNldHRsZW1lbnQgd2FzIGxhc3QgdXBkYXRlZFxuICovXG5cbmNvbnN0IG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcblxuY29uc3QgU2V0dGxlbWVudFNjaGVtYSA9IG5ldyBtb25nb29zZS5TY2hlbWEoe1xuICBwYXllcklkOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlXG4gIH0sXG4gIHJlY2VpdmVySWQ6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgcmVxdWlyZWQ6IHRydWVcbiAgfSxcbiAgYW1vdW50OiB7XG4gICAgdHlwZTogTnVtYmVyLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIG1pbjogMFxuICB9LFxuICBjdXJyZW5jeToge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICBkZWZhdWx0OiAnVVNEJ1xuICB9LFxuICBncm91cElkOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlXG4gIH0sXG4gIHN0YXR1czoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICBlbnVtOiBbJ3BlbmRpbmcnLCAnY29tcGxldGVkJywgJ2NhbmNlbGxlZCddLFxuICAgIGRlZmF1bHQ6ICdwZW5kaW5nJ1xuICB9LFxuICBjb21wbGV0ZWRBdDoge1xuICAgIHR5cGU6IERhdGVcbiAgfSxcbiAgbm90ZXM6IHtcbiAgICB0eXBlOiBTdHJpbmdcbiAgfSxcbiAgY3JlYXRlZEJ5OiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlXG4gIH1cbn0sIHtcbiAgdGltZXN0YW1wczogdHJ1ZVxufSk7XG5cbi8vIEluZGV4ZXMgZm9yIGZhc3RlciBxdWVyaWVzXG5TZXR0bGVtZW50U2NoZW1hLmluZGV4KHsgcGF5ZXJJZDogMSB9KTtcblNldHRsZW1lbnRTY2hlbWEuaW5kZXgoeyByZWNlaXZlcklkOiAxIH0pO1xuU2V0dGxlbWVudFNjaGVtYS5pbmRleCh7IGdyb3VwSWQ6IDEgfSk7XG5TZXR0bGVtZW50U2NoZW1hLmluZGV4KHsgc3RhdHVzOiAxIH0pO1xuU2V0dGxlbWVudFNjaGVtYS5pbmRleCh7IGNyZWF0ZWRBdDogLTEgfSk7XG5cbi8vIERlZmluZSBhIHRvSlNPTiBtZXRob2QgdG8gY3VzdG9taXplIHRoZSBvdXRwdXRcblNldHRsZW1lbnRTY2hlbWEubWV0aG9kcy50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgY29uc3Qgc2V0dGxlbWVudCA9IHRoaXMudG9PYmplY3QoKTtcbiAgXG4gIC8vIENvbnZlcnQgX2lkIHRvIGlkIGZvciBBUEkgY29uc2lzdGVuY3lcbiAgc2V0dGxlbWVudC5pZCA9IHNldHRsZW1lbnQuX2lkLnRvU3RyaW5nKCk7XG4gIGRlbGV0ZSBzZXR0bGVtZW50Ll9pZDtcbiAgZGVsZXRlIHNldHRsZW1lbnQuX192O1xuICBcbiAgcmV0dXJuIHNldHRsZW1lbnQ7XG59O1xuXG5jb25zdCBTZXR0bGVtZW50ID0gbW9uZ29vc2UubW9kZWwoJ1NldHRsZW1lbnQnLCBTZXR0bGVtZW50U2NoZW1h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