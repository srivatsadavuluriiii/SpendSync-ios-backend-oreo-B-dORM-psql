/**
 * User Preference Controller Tests
 * 
 * Tests for the user preference controller
 */

// Mock Redis and cache service first
jest.mock('redis', () => {
  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    on: jest.fn()
  };
  return {
    createClient: jest.fn().mockReturnValue(mockRedisClient)
  };
});

// Mock the cache service
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

// Mock database model
jest.mock('../../../src/models/user-preference.model', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
}));

// Mock the user preference service
const mockUserPreferenceService = {
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  updatePreferenceSection: jest.fn(),
  resetUserPreferences: jest.fn(),
  getNotificationSettings: jest.fn(),
  getBulkUserPreferences: jest.fn()
};

jest.mock('../../../src/services/user-preference.service', () => mockUserPreferenceService);

// Now require the controller that uses these mocks
const userPreferenceController = require('../../../src/controllers/user-preference.controller');
const { BadRequestError } = require('../../../../../shared/errors');

describe('User Preference Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request object
    mockReq = {
      user: { id: 'testUser123' },
      params: {},
      body: {}
    };
    
    // Mock response object
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    
    // Mock next middleware function
    mockNext = jest.fn();
  });
  
  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      // Mock data
      const mockPreferences = {
        id: 'pref123',
        userId: 'testUser123',
        defaultCurrency: 'EUR',
        settlementAlgorithm: 'minCashFlow'
      };
      
      // Setup mock
      mockUserPreferenceService.getUserPreferences.mockResolvedValue(mockPreferences);
      
      // Call controller
      await userPreferenceController.getUserPreferences(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockUserPreferenceService.getUserPreferences).toHaveBeenCalledWith('testUser123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should handle errors properly', async () => {
      // Setup mock to throw error
      const mockError = new Error('Test error');
      mockUserPreferenceService.getUserPreferences.mockRejectedValue(mockError);
      
      // Call controller
      await userPreferenceController.getUserPreferences(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
  
  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      // Mock data
      const mockUpdatedPreferences = {
        id: 'pref123',
        userId: 'testUser123',
        defaultCurrency: 'EUR',
        settlementAlgorithm: 'friendPreference'
      };
      
      // Setup request body
      mockReq.body = {
        defaultCurrency: 'EUR',
        settlementAlgorithm: 'friendPreference'
      };
      
      // Setup mock
      mockUserPreferenceService.updateUserPreferences.mockResolvedValue(mockUpdatedPreferences);
      
      // Call controller
      await userPreferenceController.updateUserPreferences(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockUserPreferenceService.updateUserPreferences).toHaveBeenCalledWith(
        'testUser123',
        mockReq.body
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedPreferences
      });
    });
    
    it('should handle empty update data', async () => {
      // Setup request with empty body
      mockReq.body = {};
      
      // Call controller
      await userPreferenceController.updateUserPreferences(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
      expect(mockUserPreferenceService.updateUserPreferences).not.toHaveBeenCalled();
    });
  });
  
  describe('updatePreferenceSection', () => {
    it('should update a specific section', async () => {
      // Mock data
      const mockUpdatedPreferences = {
        id: 'pref123',
        userId: 'testUser123',
        notifications: {
          email: false,
          push: true
        }
      };
      
      // Setup request
      mockReq.params.section = 'notifications';
      mockReq.body = {
        email: false,
        push: true
      };
      
      // Setup mock
      mockUserPreferenceService.updatePreferenceSection.mockResolvedValue(mockUpdatedPreferences);
      
      // Call controller
      await userPreferenceController.updatePreferenceSection(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockUserPreferenceService.updatePreferenceSection).toHaveBeenCalledWith(
        'testUser123',
        'notifications',
        mockReq.body
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedPreferences
      });
    });
    
    it('should handle invalid section', async () => {
      // Setup request
      mockReq.params.section = 'invalidSection';
      mockReq.body = { foo: 'bar' };
      
      // Call controller
      await userPreferenceController.updatePreferenceSection(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
    });
  });
  
  describe('resetUserPreferences', () => {
    it('should reset preferences to defaults', async () => {
      // Mock data
      const mockDefaultPreferences = {
        id: 'pref123',
        userId: 'testUser123',
        defaultCurrency: 'USD',
        settlementAlgorithm: 'minCashFlow'
      };
      
      // Setup mock
      mockUserPreferenceService.resetUserPreferences.mockResolvedValue(mockDefaultPreferences);
      
      // Call controller
      await userPreferenceController.resetUserPreferences(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockUserPreferenceService.resetUserPreferences).toHaveBeenCalledWith('testUser123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Preferences reset to defaults',
        data: mockDefaultPreferences
      });
    });
  });
  
  describe('specialized endpoints', () => {
    it('should set default currency', async () => {
      // Mock data
      const mockUpdatedPreferences = {
        id: 'pref123',
        userId: 'testUser123',
        defaultCurrency: 'GBP'
      };
      
      // Setup request
      mockReq.body = { currency: 'GBP' };
      
      // Setup mock
      mockUserPreferenceService.updateUserPreferences.mockResolvedValue(mockUpdatedPreferences);
      
      // Call controller
      await userPreferenceController.setDefaultCurrency(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockUserPreferenceService.updateUserPreferences).toHaveBeenCalledWith(
        'testUser123',
        { defaultCurrency: 'GBP' }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Default currency updated to GBP',
        data: mockUpdatedPreferences
      });
    });
    
    it('should set settlement algorithm', async () => {
      // Mock data
      const mockUpdatedPreferences = {
        id: 'pref123',
        userId: 'testUser123',
        settlementAlgorithm: 'greedy'
      };
      
      // Setup request
      mockReq.body = { algorithm: 'greedy' };
      
      // Setup mock
      mockUserPreferenceService.updateUserPreferences.mockResolvedValue(mockUpdatedPreferences);
      
      // Call controller
      await userPreferenceController.setSettlementAlgorithm(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockUserPreferenceService.updateUserPreferences).toHaveBeenCalledWith(
        'testUser123',
        { settlementAlgorithm: 'greedy' }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Settlement algorithm updated to greedy',
        data: mockUpdatedPreferences
      });
    });
  });
}); 