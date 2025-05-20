/**
 * Notification Preference Model
 * 
 * Represents a user's notification preferences
 */
const BaseModel = require('../../../../shared/database/models/base.model');

class NotificationPreferenceModel extends BaseModel {
  /**
   * Default notification types to include in preferences
   * @returns {Object} Default notification type preferences
   */
  static defaultTypes() {
    return {
      EXPENSE_ADDED: { email: true, push: true, sms: false },
      EXPENSE_UPDATED: { email: false, push: true, sms: false },
      EXPENSE_DELETED: { email: false, push: true, sms: false },
      SETTLEMENT_REQUESTED: { email: true, push: true, sms: false },
      SETTLEMENT_COMPLETED: { email: true, push: true, sms: false },
      SETTLEMENT_REJECTED: { email: true, push: true, sms: false },
      GROUP_CREATED: { email: true, push: true, sms: false },
      GROUP_INVITATION: { email: true, push: true, sms: false },
      GROUP_JOINED: { email: false, push: true, sms: false },
      GROUP_LEFT: { email: false, push: true, sms: false },
      FRIEND_REQUEST: { email: true, push: true, sms: false },
      FRIEND_ACCEPTED: { email: false, push: true, sms: false }
    };
  }

  /**
   * Create a new notification preference instance
   * @param {Object} data - Notification preference data
   * @returns {Object} Notification preference object
   */
  static create(data) {
    const now = this.timestamp();
    const defaults = this.defaultTypes();
    
    return {
      _id: data._id || this.generateId(),
      userId: data.userId,
      email: data.email !== undefined ? data.email : true,
      push: data.push !== undefined ? data.push : true,
      sms: data.sms !== undefined ? data.sms : false,
      notificationTypes: {
        ...defaults,
        ...(data.notificationTypes || {})
      },
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };
  }

  /**
   * Convert a preference document to a JSON response object
   * @param {Object} preference - Preference document
   * @returns {Object} Formatted preference
   */
  static toJSON(preference) {
    if (!preference) return null;
    
    return {
      userId: preference.userId,
      email: preference.email,
      push: preference.push,
      sms: preference.sms,
      notificationTypes: preference.notificationTypes,
      updatedAt: preference.updatedAt
    };
  }
}

module.exports = NotificationPreferenceModel; 