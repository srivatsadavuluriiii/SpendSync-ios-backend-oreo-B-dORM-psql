/**
 * Notification Repository
 * 
 * Handles data access for notifications
 */
const BaseRepository = require('../../../../shared/database/repositories/base.repository');
const NotificationModel = require('../models/notification.model');
const NotificationPreferenceModel = require('../models/notification-preference.model');
const dbConnection = require('../../../../shared/database/connection');
const { DatabaseError } = require('../../../../shared/errors');

class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Notifications with pagination metadata
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = options;
      
      // Build query
      const query = { userId };
      
      if (unreadOnly) {
        query.isRead = false;
      }
      
      // Get total count first
      const totalItems = await this.count(query);
      
      // Calculate offset
      const skip = (page - 1) * limit;
      
      // Get paginated results
      const notifications = await this.find(query, {
        sort: { createdAt: -1 }, // Most recent first
        limit,
        skip
      });
      
      // Format response
      return {
        notifications: notifications.map(notification => 
          NotificationModel.toJSON(notification)
        ),
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit)
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get notifications for user ${userId}`, error);
    }
  }

  /**
   * Create a notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      // Validate required fields
      const requiredFields = ['userId', 'type', 'title', 'message'];
      for (const field of requiredFields) {
        if (!notificationData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Create notification object
      const notification = NotificationModel.create(notificationData);
      
      // Save to database
      const result = await this.create(notification);
      
      return NotificationModel.toJSON(result);
    } catch (error) {
      throw new DatabaseError('Failed to create notification', error);
    }
  }

  /**
   * Create multiple notifications efficiently
   * @param {Array<Object>} notificationsData - Array of notification data
   * @returns {Promise<Array<Object>>} Created notifications
   */
  async createBatchNotifications(notificationsData) {
    try {
      if (!notificationsData || notificationsData.length === 0) {
        return [];
      }
      
      const notifications = notificationsData.map(data => {
        // Validate each notification
        const requiredFields = ['userId', 'type', 'title', 'message'];
        for (const field of requiredFields) {
          if (!data[field]) {
            throw new Error(`Missing required field: ${field} in batch notification`);
          }
        }
        
        // Create notification object
        return NotificationModel.create(data);
      });
      
      // Insert all notifications at once
      const result = await this.getCollection().insertMany(notifications);
      
      if (!result.acknowledged) {
        throw new DatabaseError('Failed to create batch notifications');
      }
      
      // Return created notifications
      return notifications.map(notification => 
        NotificationModel.toJSON(notification)
      );
    } catch (error) {
      throw new DatabaseError('Failed to create batch notifications', error);
    }
  }

  /**
   * Mark a notification as read
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success indicator
   */
  async markNotificationAsRead(userId, notificationId) {
    try {
      const query = {
        _id: this._buildIdQuery(notificationId)._id,
        userId
      };
      
      const update = {
        $set: {
          isRead: true,
          updatedAt: NotificationModel.timestamp()
        }
      };
      
      const result = await this.getCollection().updateOne(query, update);
      
      return result.matchedCount > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to mark notification ${notificationId} as read`, error);
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of updated notifications
   */
  async markAllNotificationsAsRead(userId) {
    try {
      const query = {
        userId,
        isRead: false
      };
      
      const update = {
        $set: {
          isRead: true,
          updatedAt: NotificationModel.timestamp()
        }
      };
      
      const result = await this.getCollection().updateMany(query, update);
      
      return result.modifiedCount;
    } catch (error) {
      throw new DatabaseError(`Failed to mark all notifications as read for user ${userId}`, error);
    }
  }
}

module.exports = new NotificationRepository(); 