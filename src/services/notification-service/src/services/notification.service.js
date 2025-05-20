/**
 * Notification Service
 * Handles business logic for notifications functionality
 */

const { DatabaseError } = require('../../../../shared/errors');
const notificationGenerator = require('../utils/notification.generator');
const notificationRepository = require('../repositories/notification.repository');
const preferenceRepository = require('../repositories/notification-preference.repository');
const { BadRequestError, NotFoundError } = require('@shared/errors');

// This would connect to your database in a real implementation
// const NotificationModel = require('../models/notification.model');
// const NotificationPreferenceModel = require('../models/notification-preference.model');

// Mock data for development - in production, this would use a database
const mockNotifications = [
  {
    id: '1',
    userId: 'user1',
    type: 'EXPENSE_ADDED',
    title: 'New expense added',
    message: 'Alice added a new expense of $35.50 in "Weekend Trip"',
    relatedEntityId: 'expense1',
    relatedEntityType: 'expense',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '2',
    userId: 'user1',
    type: 'SETTLEMENT_RECEIVED',
    title: 'Settlement received',
    message: 'Bob marked a payment of $50 to you as completed',
    relatedEntityId: 'settlement1',
    relatedEntityType: 'settlement',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const mockPreferences = {
  userId: 'user1',
  email: true,
  push: true,
  sms: false,
  notificationTypes: {
    EXPENSE_ADDED: {
      email: true,
      push: true,
      sms: false
    },
    SETTLEMENT_RECEIVED: {
      email: true,
      push: true,
      sms: true
    },
    GROUP_INVITATION: {
      email: true,
      push: true,
      sms: false
    }
  }
};

// Channel delivery services - in production, these would be actual services
const channelServices = {
  email: {
    send: async (userId, notification) => {
      // This would call an email service like SendGrid, Mailgun, etc.
      console.log(`[EMAIL] Sending email to user ${userId}: ${notification.title}`);
      return { success: true, channel: 'email' };
    }
  },
  push: {
    send: async (userId, notification) => {
      // This would call a push notification service like Firebase Cloud Messaging
      console.log(`[PUSH] Sending push notification to user ${userId}: ${notification.title}`);
      return { success: true, channel: 'push' };
    }
  },
  sms: {
    send: async (userId, notification) => {
      // This would call an SMS service like Twilio
      console.log(`[SMS] Sending SMS to user ${userId}: ${notification.title}`);
      return { success: true, channel: 'sms' };
    }
  }
};

/**
 * Get all notifications for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options (pagination, filters)
 * @returns {Promise<{notifications: Array, total: number, page: number, limit: number}>}
 */
async function getUserNotifications(userId, options = {}) {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    
    // In a real implementation, this would query the database
    // Filter notifications for this user
    let userNotifications = mockNotifications.filter(notification => 
      notification.userId === userId
    );
    
    // Apply unread filter if requested
    if (unreadOnly) {
      userNotifications = userNotifications.filter(notification => 
        notification.isRead === false
      );
    }
    
    // Sort by most recent first
    userNotifications.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedNotifications = userNotifications.slice(startIndex, endIndex);
    
    return {
      notifications: paginatedNotifications,
      total: userNotifications.length,
      page,
      limit,
      totalPages: Math.ceil(userNotifications.length / limit)
    };
  } catch (error) {
    throw new DatabaseError('Failed to retrieve notifications', error);
  }
}

/**
 * Create a new notification
 * @param {Object} notificationData Notification data
 * @returns {Promise<Object>} Created notification
 */
async function createNotification(notificationData) {
  if (!notificationData || !notificationData.userId || !notificationData.type) {
    throw new BadRequestError('Invalid notification data');
  }

  return notificationRepository.create({
    ...notificationData,
    read: false
  });
}

/**
 * Create and deliver multiple notifications efficiently
 * @param {Array<Object>} notificationsData - Array of notification data objects
 * @returns {Promise<Array<Object>>} - Created notifications
 */
async function createBatchNotifications(notificationsData) {
  try {
    const createdNotifications = [];
    const deliveryPromises = [];
    
    for (const data of notificationsData) {
      // Validate notification data
      const requiredFields = ['userId', 'type', 'title', 'message'];
      for (const field of requiredFields) {
        if (!data[field]) {
          throw new Error(`Missing required field: ${field} in batch notification`);
        }
      }
      
      // Create notification object
      const newNotification = {
        id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        ...data,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      // Push to mock data
      mockNotifications.push(newNotification);
      createdNotifications.push(newNotification);
      
      // Queue delivery - don't await each one
      deliveryPromises.push(deliverNotification(newNotification));
    }
    
    // Process all deliveries in parallel
    await Promise.allSettled(deliveryPromises);
    
    return createdNotifications;
  } catch (error) {
    throw new DatabaseError('Failed to create batch notifications', error);
  }
}

/**
 * Mark a notification as read
 * @param {string} notificationId Notification ID
 * @returns {Promise<Object>} Updated notification
 */
async function markAsRead(notificationId) {
  if (!notificationId) {
    throw new BadRequestError('Notification ID is required');
  }

  const notification = await notificationRepository.findById(notificationId);
  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  return notificationRepository.update(notificationId, { read: true });
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of updated notifications
 */
async function markAllNotificationsAsRead(userId) {
  try {
    let count = 0;
    
    // Update all unread notifications for this user
    mockNotifications.forEach(notification => {
      if (notification.userId === userId && !notification.isRead) {
        notification.isRead = true;
        count++;
      }
    });
    
    return count;
  } catch (error) {
    throw new DatabaseError('Failed to mark all notifications as read', error);
  }
}

/**
 * Get user notification preferences
 * @param {string} userId User ID
 * @returns {Promise<Object>} User preferences
 */
async function getUserPreferences(userId) {
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }

  let preferences = await preferenceRepository.findByUserId(userId);
  if (!preferences) {
    // Create default preferences
    preferences = await preferenceRepository.create({
      userId,
      email: true,
      push: true,
      reminderFrequency: 'daily'
    });
  }

  return preferences;
}

/**
 * Update user notification preferences
 * @param {string} userId User ID
 * @param {Object} updateData Update data
 * @returns {Promise<Object>} Updated preferences
 */
async function updateUserPreferences(userId, updateData) {
  if (!userId || !updateData) {
    throw new BadRequestError('User ID and update data are required');
  }

  let preferences = await preferenceRepository.findByUserId(userId);
  if (!preferences) {
    preferences = await preferenceRepository.create({
      userId,
      ...updateData
    });
  } else {
    preferences = await preferenceRepository.update(preferences.id, updateData);
  }

  return preferences;
}

/**
 * Helper to deliver notification through appropriate channels
 * @param {Object} notification - Notification object
 * @returns {Promise<Array>} - Array of delivery results
 */
async function deliverNotification(notification) {
  try {
    // Get user's preferences
    const preferences = await getUserPreferences(notification.userId);
    
    // Get type-specific preferences, fallback to general preferences
    const typePreferences = preferences.notificationTypes[notification.type] || {
      email: preferences.email,
      push: preferences.push,
      sms: preferences.sms
    };
    
    const deliveryPromises = [];
    
    // Deliver through appropriate channels
    if (typePreferences.email) {
      deliveryPromises.push(
        channelServices.email.send(notification.userId, notification)
          .catch(error => ({
            success: false,
            channel: 'email',
            error: error.message
          }))
      );
    }
    
    if (typePreferences.push) {
      deliveryPromises.push(
        channelServices.push.send(notification.userId, notification)
          .catch(error => ({
            success: false,
            channel: 'push',
            error: error.message
          }))
      );
    }
    
    if (typePreferences.sms) {
      deliveryPromises.push(
        channelServices.sms.send(notification.userId, notification)
          .catch(error => ({
            success: false,
            channel: 'sms',
            error: error.message
          }))
      );
    }
    
    // Wait for all deliveries to complete
    const results = await Promise.all(deliveryPromises);
    
    // Log any failures but don't throw
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.error('Some notification deliveries failed:', failures);
    }
    
    return results;
  } catch (error) {
    console.error('Error in deliverNotification:', error);
    // Don't rethrow - delivery failures shouldn't block the main operation
    return [{
      success: false,
      error: error.message || 'Unknown error'
    }];
  }
}

/**
 * Get notifications for a user
 * @param {string} userId User ID
 * @returns {Promise<Array>} List of notifications
 */
async function getNotifications(userId) {
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }

  return notificationRepository.findByUserId(userId);
}

module.exports = {
  getUserNotifications,
  createNotification,
  createBatchNotifications,
  markAsRead,
  markAllNotificationsAsRead,
  getUserPreferences,
  updateUserPreferences,
  getNotifications
}; 