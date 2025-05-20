/**
 * Notification Controller
 * Handles all notification-related API endpoints
 */

const { BadRequestError, NotFoundError } = require('../../../../shared/errors');
const NotificationService = require('../services/notification.service');

/**
 * Get all notifications for authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getUserNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const notifications = await NotificationService.getUserNotifications(
      userId, 
      { page, limit, unreadOnly }
    );
    
    return res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    if (!notificationId) {
      throw new BadRequestError('Notification ID is required');
    }
    
    const result = await NotificationService.markNotificationAsRead(userId, notificationId);
    
    if (!result) {
      throw new NotFoundError(`Notification with ID ${notificationId} not found`);
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Notification marked as read',
      data: { notificationId }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all notifications as read for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    
    const count = await NotificationService.markAllNotificationsAsRead(userId);
    
    return res.status(200).json({ 
      success: true,
      message: `${count} notifications marked as read` 
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getNotificationPreferences(req, res, next) {
  try {
    const userId = req.user.id;
    
    const preferences = await NotificationService.getNotificationPreferences(userId);
    
    return res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updateNotificationPreferences(req, res, next) {
  try {
    const userId = req.user.id;
    const preferences = req.body;
    
    if (!preferences || Object.keys(preferences).length === 0) {
      throw new BadRequestError('Notification preferences are required');
    }
    
    const updatedPreferences = await NotificationService.updateNotificationPreferences(
      userId, 
      preferences
    );
    
    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      data: updatedPreferences
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationPreferences,
  updateNotificationPreferences
}; 