/**
 * User Preference Service Tests
 * 
 * Tests for the user preference service
 */

// Mock the cache service before requiring the user preference service
jest.mock('../../../src/services/cache.service', () => ({
  generateCacheKey: jest.fn().mockReturnValue('test-cache-key'),
  cacheResult: jest.fn().mockImplementation(async (fn) => fn()),
  del: jest.fn().mockResolvedValue(true)
}));

// Mock the metrics and timers
jest.mock('../../../src/config/monitoring', () => ({
  metrics: {
    cacheHitCounter: {
      inc: jest.fn()
    },
    cacheSetCounter: {
      inc: jest.fn()
    },
    cacheErrorCounter: {
      inc: jest.fn()
    },
    cacheInvalidationCounter: {
      inc: jest.fn()
    }
  },
  timers: {
    createDbTimer: jest.fn().mockReturnValue(jest.fn())
  }
}));

// Mock the UserPreference model
jest.mock('../../../src/models/user-preference.model', () => {
  // Helper for deep merging objects
  function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  const defaultPreferences = {
    userId: 'default-user',
    defaultCurrency: 'USD',
    settlementAlgorithm: 'minCashFlow',
    notifications: {
      email: true,
      push: true,
      reminderFrequency: 'medium'
    },
    displaySettings: {
      theme: 'system'
    }
  };
  
  // Mock database for storage
  const mockDb = {};
  
  return {
    findOne: jest.fn().mockImplementation(async (query) => {
      const userId = query.userId;
      if (mockDb[userId]) {
        return { 
          ...mockDb[userId],
          save: async () => mockDb[userId]
        };
      }
      return null;
    }),
    findOneAndUpdate: jest.fn().mockImplementation(async (query, update, options) => {
      const userId = query.userId;
      const updateData = update.$set || {};
      
      if (mockDb[userId]) {
        // Deep merge to update nested objects correctly
        mockDb[userId] = deepMerge(mockDb[userId], updateData);
      } else if (options.upsert) {
        // Create new record if upsert is true
        mockDb[userId] = { 
          ...defaultPreferences,
          userId, // Override the default userId with the query userId
          ...updateData 
        };
      }
      
      return {
        ...mockDb[userId],
        save: async () => mockDb[userId]
      };
    }),
    findOneAndDelete: jest.fn().mockImplementation(async (query) => {
      const userId = query.userId;
      const record = mockDb[userId];
      delete mockDb[userId];
      return record;
    }),
    create: jest.fn().mockImplementation(async (data) => {
      const userId = data.userId;
      mockDb[userId] = { 
        ...defaultPreferences,
        ...data 
      };
      return {
        ...mockDb[userId],
        save: async () => mockDb[userId]
      };
    }),
    find: jest.fn().mockImplementation(async (query) => {
      const userIds = query.userId.$in || [];
      return userIds
        .filter(id => mockDb[id])
        .map(id => ({
          ...mockDb[id],
          save: async () => mockDb[id]
        }));
    }),
    // Add a method to clear the mock DB for tests
    __clearMockDb: () => {
      Object.keys(mockDb).forEach(key => delete mockDb[key]);
    }
  };
});

// Now require the service after all mocks are set up
const userPreferenceService = require('../../../src/services/user-preference.service');
const { BadRequestError } = require('../../../../../shared/errors');

describe('User Preference Service', () => {
  const UserPreference = require('../../../src/models/user-preference.model');
  
  beforeEach(() => {
    // Clear mock DB and reset all mocks between tests
    UserPreference.__clearMockDb();
    jest.clearAllMocks();
  });
  
  describe('getUserPreferences', () => {
    it('should throw error if userId is not provided', async () => {
      await expect(userPreferenceService.getUserPreferences()).rejects.toThrow(BadRequestError);
      await expect(userPreferenceService.getUserPreferences(null)).rejects.toThrow(BadRequestError);
    });
    
    it('should create default preferences if none exist', async () => {
      const userId = 'user123';
      
      const preferences = await userPreferenceService.getUserPreferences(userId);
      
      expect(preferences).not.toBeNull();
      expect(preferences.userId).toBe(userId);
      expect(preferences.defaultCurrency).toBe('USD');
      expect(preferences.settlementAlgorithm).toBe('minCashFlow');
      expect(preferences.notifications.email).toBe(true);
      expect(preferences.displaySettings.theme).toBe('system');
    });
    
    it('should return existing preferences if they exist', async () => {
      const userId = 'user123';
      const customCurrency = 'EUR';
      
      // Create preferences first
      await UserPreference.create({
        userId,
        defaultCurrency: customCurrency
      });
      
      const preferences = await userPreferenceService.getUserPreferences(userId);
      
      expect(preferences).not.toBeNull();
      expect(preferences.userId).toBe(userId);
      expect(preferences.defaultCurrency).toBe(customCurrency);
    });
  });
  
  describe('updateUserPreferences', () => {
    it('should throw error if userId is not provided', async () => {
      await expect(userPreferenceService.updateUserPreferences(null, { defaultCurrency: 'EUR' }))
        .rejects.toThrow(BadRequestError);
    });
    
    it('should update existing preferences', async () => {
      const userId = 'user123';
      const initialPrefs = await userPreferenceService.getUserPreferences(userId);
      
      const updatedData = {
        defaultCurrency: 'EUR',
        settlementAlgorithm: 'friendPreference',
        notifications: {
          email: false,
          push: false
        }
      };
      
      const updatedPrefs = await userPreferenceService.updateUserPreferences(userId, updatedData);
      
      expect(updatedPrefs).not.toBeNull();
      expect(updatedPrefs.defaultCurrency).toBe('EUR');
      expect(updatedPrefs.settlementAlgorithm).toBe('friendPreference');
      expect(updatedPrefs.notifications.email).toBe(false);
      expect(updatedPrefs.notifications.push).toBe(false);
      
      // Make sure other fields kept defaults
      expect(updatedPrefs.notifications.reminderFrequency).toBe('medium');
    });
    
    it('should create preferences if none exist', async () => {
      const userId = 'newuser456';
      
      const updatedData = {
        defaultCurrency: 'GBP'
      };
      
      const prefs = await userPreferenceService.updateUserPreferences(userId, updatedData);
      
      expect(prefs).not.toBeNull();
      expect(prefs.userId).toBe(userId);
      expect(prefs.defaultCurrency).toBe('GBP');
    });
    
    it('should remove userId if provided in update data', async () => {
      const userId = 'user123';
      
      const updatedData = {
        userId: 'hacker456',
        defaultCurrency: 'EUR'
      };
      
      const prefs = await userPreferenceService.updateUserPreferences(userId, updatedData);
      
      expect(prefs.userId).toBe(userId);
      expect(prefs.userId).not.toBe('hacker456');
      expect(prefs.defaultCurrency).toBe('EUR');
    });
  });
  
  describe('updatePreferenceSection', () => {
    it('should throw error if section is invalid', async () => {
      const userId = 'user123';
      await expect(userPreferenceService.updatePreferenceSection(
        userId, 'invalidSection', { foo: 'bar' }
      )).rejects.toThrow(BadRequestError);
    });
    
    it('should update only the specified section', async () => {
      const userId = 'user123';
      
      // Create initial preferences
      await userPreferenceService.getUserPreferences(userId);
      
      // Update notifications section
      const notificationsUpdate = {
        email: false,
        reminderFrequency: 'low'
      };
      
      const updatedPrefs = await userPreferenceService.updatePreferenceSection(
        userId, 'notifications', notificationsUpdate
      );
      
      expect(updatedPrefs.notifications.email).toBe(false);
      expect(updatedPrefs.notifications.reminderFrequency).toBe('low');
      expect(updatedPrefs.notifications.push).toBe(true); // Unchanged default
      
      // Make sure other sections are unchanged
      expect(updatedPrefs.defaultCurrency).toBe('USD');
      expect(updatedPrefs.settlementAlgorithm).toBe('minCashFlow');
    });
  });
  
  describe('resetUserPreferences', () => {
    it('should reset preferences to defaults', async () => {
      const userId = 'user123';
      
      // Create preferences with custom values
      await userPreferenceService.updateUserPreferences(userId, {
        defaultCurrency: 'EUR',
        notifications: {
          email: false,
          push: false
        }
      });
      
      // Reset to defaults
      const resetPrefs = await userPreferenceService.resetUserPreferences(userId);
      
      expect(resetPrefs.defaultCurrency).toBe('USD');
      expect(resetPrefs.notifications.email).toBe(true);
      expect(resetPrefs.notifications.push).toBe(true);
    });
  });
  
  describe('getNotificationSettings', () => {
    it('should return only the notifications section', async () => {
      const userId = 'user123';
      
      // Create preferences with custom notification settings
      await userPreferenceService.updateUserPreferences(userId, {
        notifications: {
          email: false,
          push: true,
          reminderFrequency: 'high'
        }
      });
      
      const notifications = await userPreferenceService.getNotificationSettings(userId);
      
      expect(notifications.email).toBe(false);
      expect(notifications.push).toBe(true);
      expect(notifications.reminderFrequency).toBe('high');
    });
  });
  
  describe('getBulkUserPreferences', () => {
    it('should return preferences for multiple users', async () => {
      // Create preferences for three users
      await userPreferenceService.updateUserPreferences('user1', { defaultCurrency: 'EUR' });
      await userPreferenceService.updateUserPreferences('user2', { defaultCurrency: 'GBP' });
      await userPreferenceService.updateUserPreferences('user3', { defaultCurrency: 'JPY' });
      
      const userIds = ['user1', 'user2', 'user3', 'user4']; // user4 doesn't exist
      
      const preferencesMap = await userPreferenceService.getBulkUserPreferences(userIds);
      
      expect(Object.keys(preferencesMap).length).toBe(4);
      expect(preferencesMap.user1.defaultCurrency).toBe('EUR');
      expect(preferencesMap.user2.defaultCurrency).toBe('GBP');
      expect(preferencesMap.user3.defaultCurrency).toBe('JPY');
      expect(preferencesMap.user4.defaultCurrency).toBe('USD'); // Default for new user
    });
    
    it('should throw error if userIds is not an array', async () => {
      await expect(userPreferenceService.getBulkUserPreferences('invalid'))
        .rejects.toThrow(BadRequestError);
      await expect(userPreferenceService.getBulkUserPreferences([]))
        .rejects.toThrow(BadRequestError);
    });
  });
}); 