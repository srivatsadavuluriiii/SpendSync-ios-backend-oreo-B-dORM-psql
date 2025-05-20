/**
 * User Preference Model
 *
 * Defines the data structure for user preferences
 *
 * @swagger
 * components:
 *   schemas:
 *     UserPreferenceModel:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *         userId:
 *           type: string
 *           description: ID of the user these preferences belong to
 *         defaultCurrency:
 *           type: string
 *           description: Preferred currency code (e.g., USD, EUR)
 *           default: "USD"
 *         settlementAlgorithm:
 *           type: string
 *           enum: [minCashFlow, greedy, friendPreference]
 *           default: "minCashFlow"
 *           description: Preferred settlement algorithm
 *         notifications:
 *           type: object
 *           properties:
 *             email:
 *               type: boolean
 *               default: true
 *               description: Enable email notifications
 *             push:
 *               type: boolean
 *               default: true
 *               description: Enable push notifications
 *             reminderFrequency:
 *               type: string
 *               enum: [never, low, medium, high]
 *               default: "medium"
 *               description: Frequency of reminders
 *             settlementCreated:
 *               type: boolean
 *               default: true
 *               description: Notify when settlements are created
 *             settlementCompleted:
 *               type: boolean
 *               default: true
 *               description: Notify when settlements are completed
 *             paymentReceived:
 *               type: boolean
 *               default: true
 *               description: Notify when payments are received
 *             remindersBefore:
 *               type: number
 *               default: 2
 *               description: Days before due date to send reminders
 *         displaySettings:
 *           type: object
 *           properties:
 *             theme:
 *               type: string
 *               enum: [light, dark, system]
 *               default: "system"
 *               description: UI theme preference
 *             dateFormat:
 *               type: string
 *               enum: [MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD]
 *               default: "MM/DD/YYYY"
 *               description: Preferred date format
 *             numberFormat:
 *               type: string
 *               enum: [thousand_comma, thousand_dot, thousand_space]
 *               default: "thousand_comma"
 *               description: Preferred number format
 *         privacySettings:
 *           type: object
 *           properties:
 *             shareSettlementHistory:
 *               type: boolean
 *               default: false
 *               description: Share settlement history with group members
 *             showRealName:
 *               type: boolean
 *               default: true
 *               description: Show real name to other users
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the preferences were created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the preferences were last updated
 */
const mongoose = require('mongoose');
const UserPreferenceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    defaultCurrency: {
        type: String,
        default: 'USD'
    },
    settlementAlgorithm: {
        type: String,
        enum: ['minCashFlow', 'greedy', 'friendPreference'],
        default: 'minCashFlow'
    },
    notifications: {
        email: {
            type: Boolean,
            default: true
        },
        push: {
            type: Boolean,
            default: true
        },
        reminderFrequency: {
            type: String,
            enum: ['never', 'low', 'medium', 'high'],
            default: 'medium'
        },
        settlementCreated: {
            type: Boolean,
            default: true
        },
        settlementCompleted: {
            type: Boolean,
            default: true
        },
        paymentReceived: {
            type: Boolean,
            default: true
        },
        remindersBefore: {
            type: Number,
            default: 2,
            min: 0,
            max: 14
        }
    },
    displaySettings: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system'
        },
        dateFormat: {
            type: String,
            enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
            default: 'MM/DD/YYYY'
        },
        numberFormat: {
            type: String,
            enum: ['thousand_comma', 'thousand_dot', 'thousand_space'],
            default: 'thousand_comma'
        }
    },
    privacySettings: {
        shareSettlementHistory: {
            type: Boolean,
            default: false
        },
        showRealName: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});
// Define a toJSON method to customize the output
UserPreferenceSchema.methods.toJSON = function () {
    const userPreference = this.toObject();
    // Convert _id to id for API consistency
    userPreference.id = userPreference._id.toString();
    delete userPreference._id;
    delete userPreference.__v;
    return userPreference;
};
const UserPreference = mongoose.model('UserPreference', UserPreferenceSchema);
module.exports = UserPreference;
export {};
//# sourceMappingURL=user-preference.model.js.map