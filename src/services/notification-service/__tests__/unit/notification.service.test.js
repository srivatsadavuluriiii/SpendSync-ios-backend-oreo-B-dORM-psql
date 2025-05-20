/**
 * Unit tests for Notification Service
 */

const notificationService = require('../../src/services/notification.service');

// Mock repositories
jest.mock('../../src/repositories/notification.repository', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn()
}));

jest.mock('../../src/repositories/notification-preference.repository', () => ({
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn()
}));

// Import mocked repositories
const notificationRepository = require('../../src/repositories/notification.repository');
const preferenceRepository = require('../../src/repositories/notification-preference.repository');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      // Mock data
      const notificationData = {
        userId: 'user-123',
        type: 'expense',
        title: 'New Expense Added',
        message: 'You have been added to a new expense',
        referenceId: 'expense-456'
      };

      // Mock repository response
      const createdNotification = { ...notificationData, id: 'notif-789', read: false };
      notificationRepository.create.mockResolvedValue(createdNotification);

      // Call service
      const result = await notificationService.createNotification(notificationData);

      // Assert
      expect(notificationRepository.create).toHaveBeenCalledWith({
        ...notificationData,
        read: false
      });
      expect(result).toEqual(createdNotification);
    });

    it('should throw error if required fields are missing', async () => {
      // Call service with invalid data
      await expect(notificationService.createNotification({}))
        .rejects.toThrow('Invalid notification data');
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for a user', async () => {
      // Mock data
      const userId = 'user-123';
      const notifications = [
        { id: 'notif-1', userId, type: 'expense', read: false },
        { id: 'notif-2', userId, type: 'settlement', read: true }
      ];

      // Mock repository response
      notificationRepository.findByUserId.mockResolvedValue(notifications);

      // Call service
      const result = await notificationService.getNotifications(userId);

      // Assert
      expect(notificationRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(notifications);
    });

    it('should throw error if userId is not provided', async () => {
      await expect(notificationService.getNotifications())
        .rejects.toThrow('User ID is required');
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      // Mock data
      const notificationId = 'notif-123';
      const notification = {
        id: notificationId,
        userId: 'user-123',
        type: 'expense',
        read: false
      };
      const updatedNotification = { ...notification, read: true };

      // Mock repository responses
      notificationRepository.findById.mockResolvedValue(notification);
      notificationRepository.update.mockResolvedValue(updatedNotification);

      // Call service
      const result = await notificationService.markAsRead(notificationId);

      // Assert
      expect(notificationRepository.findById).toHaveBeenCalledWith(notificationId);
      expect(notificationRepository.update).toHaveBeenCalledWith(notificationId, { read: true });
      expect(result).toEqual(updatedNotification);
    });

    it('should throw error if notification is not found', async () => {
      // Mock repository response
      notificationRepository.findById.mockResolvedValue(null);

      // Call service
      await expect(notificationService.markAsRead('non-existent'))
        .rejects.toThrow('Notification not found');
    });
  });

  describe('getUserPreferences', () => {
    it('should return existing preferences', async () => {
      // Mock data
      const userId = 'user-123';
      const preferences = {
        userId,
        email: true,
        push: true,
        reminderFrequency: 'daily'
      };

      // Mock repository response
      preferenceRepository.findByUserId.mockResolvedValue(preferences);

      // Call service
      const result = await notificationService.getUserPreferences(userId);

      // Assert
      expect(preferenceRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(preferences);
    });

    it('should create default preferences if none exist', async () => {
      // Mock data
      const userId = 'user-123';
      const defaultPreferences = {
        userId,
        email: true,
        push: true,
        reminderFrequency: 'daily'
      };

      // Mock repository responses
      preferenceRepository.findByUserId.mockResolvedValue(null);
      preferenceRepository.create.mockResolvedValue(defaultPreferences);

      // Call service
      const result = await notificationService.getUserPreferences(userId);

      // Assert
      expect(preferenceRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(preferenceRepository.create).toHaveBeenCalledWith(defaultPreferences);
      expect(result).toEqual(defaultPreferences);
    });
  });
}); 