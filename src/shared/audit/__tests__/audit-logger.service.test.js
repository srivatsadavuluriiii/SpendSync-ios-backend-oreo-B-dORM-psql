const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const AuditLoggerService = require('../audit-logger.service');

describe('AuditLoggerService', () => {
  let mongoServer;
  let mongoClient;
  let auditLogger;
  let db;

  const testConfig = {
    serviceName: 'test-service',
    dbName: 'test_audit_logs',
    retentionDays: 90
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = await MongoClient.connect(uri);
    db = mongoClient.db(testConfig.dbName);
    
    auditLogger = new AuditLoggerService(testConfig);
    await auditLogger.initialize(mongoClient);
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await db.collection('auditLogs').deleteMany({});
  });

  describe('log', () => {
    it('should log an audit event', async () => {
      const testEvent = {
        eventType: 'TEST_EVENT',
        severity: 'INFO',
        userId: 'test-user',
        action: 'test-action',
        metadata: {
          ip: '127.0.0.1'
        }
      };

      await auditLogger.log(testEvent);

      const logs = await db.collection('auditLogs').find({}).toArray();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        ...testEvent,
        service: testConfig.serviceName,
        environment: expect.any(String),
        eventId: expect.any(String),
        timestamp: expect.any(Date)
      });
    });

    it('should emit an event when logging', async () => {
      const eventHandler = jest.fn();
      auditLogger.on('auditEvent', eventHandler);

      const testEvent = {
        eventType: 'TEST_EVENT',
        severity: 'INFO'
      };

      await auditLogger.log(testEvent);

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining(testEvent)
      );
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Insert test data
      await db.collection('auditLogs').insertMany([
        {
          eventType: 'TEST_EVENT',
          severity: 'INFO',
          userId: 'user1',
          timestamp: new Date('2023-01-01')
        },
        {
          eventType: 'TEST_EVENT',
          severity: 'WARNING',
          userId: 'user2',
          timestamp: new Date('2023-01-02')
        },
        {
          eventType: 'OTHER_EVENT',
          severity: 'ERROR',
          userId: 'user1',
          timestamp: new Date('2023-01-03')
        }
      ]);
    });

    it('should query audit logs with filters', async () => {
      const query = {
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        eventTypes: ['TEST_EVENT'],
        userIds: ['user1'],
        severities: ['INFO']
      };

      const results = await auditLogger.query(query);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        eventType: 'TEST_EVENT',
        severity: 'INFO',
        userId: 'user1'
      });
    });

    it('should handle pagination', async () => {
      const query = {
        page: 1,
        limit: 2
      };

      const results = await auditLogger.query(query);
      expect(results).toHaveLength(2);
    });
  });

  describe('getEventStats', () => {
    beforeEach(async () => {
      // Insert test data
      await db.collection('auditLogs').insertMany([
        {
          eventType: 'TEST_EVENT',
          userId: 'user1',
          severity: 'INFO',
          metadata: { ip: '1.1.1.1' },
          timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        },
        {
          eventType: 'TEST_EVENT',
          userId: 'user2',
          severity: 'WARNING',
          metadata: { ip: '1.1.1.2' },
          timestamp: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
        },
        {
          eventType: 'TEST_EVENT',
          userId: 'user1',
          severity: 'ERROR',
          metadata: { ip: '1.1.1.1' },
          timestamp: new Date(Date.now() - 90 * 60 * 1000) // 90 minutes ago
        }
      ]);
    });

    it('should return event statistics', async () => {
      const stats = await auditLogger.getEventStats('TEST_EVENT', 60);
      
      expect(stats).toMatchObject({
        count: 2,
        uniqueUsers: expect.arrayContaining(['user1', 'user2']),
        uniqueIPs: expect.arrayContaining(['1.1.1.1', '1.1.1.2']),
        severityCounts: expect.arrayContaining(['INFO', 'WARNING'])
      });
    });
  });

  describe('alert thresholds', () => {
    it('should emit alert when threshold is exceeded', async () => {
      const alertHandler = jest.fn();
      auditLogger.on('alert', alertHandler);

      auditLogger.setAlertThreshold('TEST_EVENT', {
        limit: 2,
        windowMinutes: 1,
        severity: 'WARNING'
      });

      // Log events that exceed threshold
      await auditLogger.log({ eventType: 'TEST_EVENT' });
      await auditLogger.log({ eventType: 'TEST_EVENT' });
      await auditLogger.log({ eventType: 'TEST_EVENT' });

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'THRESHOLD_EXCEEDED',
          eventType: 'TEST_EVENT',
          count: expect.any(Number)
        })
      );
    });

    it('should reset counter after window expires', async () => {
      const alertHandler = jest.fn();
      auditLogger.on('alert', alertHandler);

      auditLogger.setAlertThreshold('TEST_EVENT', {
        limit: 2,
        windowMinutes: 1,
        severity: 'WARNING'
      });

      // Set window start to past time
      const threshold = auditLogger.alertThresholds.get('TEST_EVENT');
      threshold.windowStart = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      threshold.count = 1;

      // Log new event
      await auditLogger.log({ eventType: 'TEST_EVENT' });

      // Counter should have reset, so no alert
      expect(alertHandler).not.toHaveBeenCalled();
    });
  });
}); 