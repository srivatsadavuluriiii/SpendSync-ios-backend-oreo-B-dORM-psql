/**
 * Notification Model
 * 
 * Represents a notification in the system
 */
const BaseModel = require('../../../../shared/database/models/base.model');

class NotificationModel extends BaseModel {
  /**
   * Create a new notification instance
   * @param {Object} data - Notification data
   * @returns {Object} Notification object
   */
  static create(data) {
    const now = this.timestamp();
    
    return {
      _id: data._id || this.generateId(),
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityId: data.relatedEntityId || null,
      relatedEntityType: data.relatedEntityType || null,
      groupId: data.groupId || null,
      isRead: false,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };
  }

  /**
   * Convert a notification document to a JSON response object
   * @param {Object} notification - Notification document
   * @returns {Object} Formatted notification
   */
  static toJSON(notification) {
    if (!notification) return null;
    
    return {
      id: notification._id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedEntityId: notification.relatedEntityId,
      relatedEntityType: notification.relatedEntityType,
      groupId: notification.groupId,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt
    };
  }
}

module.exports = NotificationModel; 