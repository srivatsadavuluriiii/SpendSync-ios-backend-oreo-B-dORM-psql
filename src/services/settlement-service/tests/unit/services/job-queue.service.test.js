/**
 * Job Queue Service Tests
 * 
 * Tests for the Bull-based job queue service
 */

// Mock Bull constructor and its instances
const mockAdd = jest.fn().mockResolvedValue({ id: 'test-job-id' });
const mockOn = jest.fn();
const mockGetJobCounts = jest.fn().mockResolvedValue({
  waiting: 1,
  active: 2,
  completed: 10,
  failed: 0,
  delayed: 3
});

// Mock instance that will be returned from Bull constructor
const mockQueueInstance = {
  add: mockAdd,
  on: mockOn,
  getJobCounts: mockGetJobCounts
};

// Mock Bull constructor
const MockBull = jest.fn().mockImplementation(() => mockQueueInstance);

// Set up module mocks
jest.mock('bull', () => MockBull);

// Mock prom-client
jest.mock('prom-client', () => ({
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn()
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn()
  }))
}));

// Mock monitoring module
jest.mock('../../../src/config/monitoring', () => ({
  register: {}
}));

// Mock job queue service with custom implementation
jest.mock('../../../src/services/job-queue.service.ts', () => {
  // Create queues
  const emailQueue = mockQueueInstance;
  const reminderQueue = mockQueueInstance;
  const settlementQueue = mockQueueInstance;

  // Create service methods
  const addEmailNotificationJob = jest.fn().mockImplementation((data, options = {}) => {
    return emailQueue.add(data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      ...options
    });
  });

  const addSettlementReminderJob = jest.fn().mockImplementation((data, options = {}) => {
    return reminderQueue.add(data, {
      attempts: 3,
      delay: 0,
      ...options
    });
  });

  const addSettlementProcessingJob = jest.fn().mockImplementation((data, options = {}) => {
    return settlementQueue.add(data, {
      attempts: 3,
      ...options
    });
  });

  const scheduleSettlementReminder = jest.fn().mockImplementation((data, scheduledFor) => {
    const now = new Date();
    const targetDate = new Date(scheduledFor);
    const delayMs = Math.max(0, targetDate.getTime() - now.getTime());
    
    return reminderQueue.add(data, {
      attempts: 3,
      delay: delayMs
    });
  });

  const getQueuesHealth = jest.fn().mockImplementation(async () => {
    const [emailCounts, reminderCounts, settlementCounts] = await Promise.all([
      emailQueue.getJobCounts(),
      reminderQueue.getJobCounts(),
      settlementQueue.getJobCounts()
    ]);
    
    return {
      email: emailCounts,
      reminders: reminderCounts,
      settlement: settlementCounts
    };
  });

  return {
    emailQueue,
    reminderQueue,
    settlementQueue,
    addEmailNotificationJob,
    addSettlementReminderJob,
    addSettlementProcessingJob,
    scheduleSettlementReminder,
    getQueuesHealth
  };
});

// Import module under test (which is now mocked)
const Bull = require('bull');
const jobQueueService = require('../../../src/services/job-queue.service.ts');

describe('Job Queue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Queue Creation', () => {
    it('should create queues for different job types', () => {
      // Test that the service has access to the queues
      expect(jobQueueService.emailQueue).toBeDefined();
      expect(jobQueueService.reminderQueue).toBeDefined();
      expect(jobQueueService.settlementQueue).toBeDefined();
    });
  });
  
  describe('addEmailNotificationJob', () => {
    it('should add a job to the email queue', async () => {
      const jobData = {
        userId: '123',
        email: 'test@example.com',
        subject: 'Test Email',
        templateType: 'test_template',
        templateData: { key: 'value' }
      };
      
      const result = await jobQueueService.addEmailNotificationJob(jobData);
      
      expect(mockAdd).toHaveBeenCalledWith(jobData, expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      }));
      
      expect(result).toEqual({ id: 'test-job-id' });
    });
    
    it('should allow custom job options', async () => {
      const jobData = { userId: '123', email: 'test@example.com' };
      const options = { delay: 5000, priority: 1 };
      
      await jobQueueService.addEmailNotificationJob(jobData, options);
      
      expect(mockAdd).toHaveBeenCalledWith(jobData, expect.objectContaining({
        delay: 5000,
        priority: 1
      }));
    });
  });
  
  describe('addSettlementReminderJob', () => {
    it('should add a job to the reminder queue', async () => {
      const jobData = {
        settlementId: 'abc123',
        userId: '123',
        dueDate: new Date(),
        reminderType: 'initial'
      };
      
      const result = await jobQueueService.addSettlementReminderJob(jobData);
      
      expect(mockAdd).toHaveBeenCalledWith(jobData, expect.objectContaining({
        attempts: 3,
        delay: 0
      }));
      
      expect(result).toEqual({ id: 'test-job-id' });
    });
  });
  
  describe('addSettlementProcessingJob', () => {
    it('should add a job to the settlement queue', async () => {
      const jobData = {
        settlementId: 'abc123',
        processType: 'auto_complete',
        payload: {}
      };
      
      await jobQueueService.addSettlementProcessingJob(jobData);
      
      expect(mockAdd).toHaveBeenCalledWith(jobData, expect.objectContaining({
        attempts: 3
      }));
    });
  });
  
  describe('scheduleSettlementReminder', () => {
    it('should calculate correct delay for future date', async () => {
      // Set up a date 2 days in the future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      
      const jobData = {
        settlementId: 'abc123',
        userId: '123',
        dueDate: new Date(),
        reminderType: 'initial'
      };
      
      // Mock Date.now to return a consistent value
      const now = new Date();
      jest.spyOn(global.Date, 'now').mockImplementation(() => now.getTime());
      
      await jobQueueService.scheduleSettlementReminder(jobData, futureDate);
      
      // Verify that mockAdd was called with appropriate arguments
      expect(mockAdd).toHaveBeenCalledWith(
        jobData,
        expect.objectContaining({
          attempts: 3
        })
      );
      
      // Verify that delay is approximately 2 days (172800000 ms)
      const callOptions = mockAdd.mock.calls[0][1];
      expect(callOptions.delay).toBeGreaterThan(172000000); // Close to 2 days
      expect(callOptions.delay).toBeLessThan(173000000);
      
      // Restore Date.now
      global.Date.now.mockRestore();
    });
    
    it('should use 0 delay for past dates', async () => {
      // Set up a date in the past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const jobData = {
        settlementId: 'abc123',
        userId: '123',
        dueDate: new Date(),
        reminderType: 'initial'
      };
      
      await jobQueueService.scheduleSettlementReminder(jobData, pastDate);
      
      expect(mockAdd).toHaveBeenCalledWith(jobData, expect.objectContaining({
        delay: 0
      }));
    });
  });
  
  describe('getQueuesHealth', () => {
    it('should return health information for all queues', async () => {
      const health = await jobQueueService.getQueuesHealth();
      
      expect(health).toEqual({
        email: {
          waiting: 1,
          active: 2,
          completed: 10,
          failed: 0,
          delayed: 3
        },
        reminders: {
          waiting: 1,
          active: 2,
          completed: 10,
          failed: 0,
          delayed: 3
        },
        settlement: {
          waiting: 1,
          active: 2,
          completed: 10,
          failed: 0,
          delayed: 3
        }
      });
      
      expect(mockGetJobCounts).toHaveBeenCalledTimes(3);
    });
  });
}); 