const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const supertest = require('supertest');
const express = require('express');
const ApiKeyService = require('../api-key.service');
const AuditLoggerService = require('../audit-logger.service');
const AuditAlertService = require('../alert.service');
const createApiKeyMiddleware = require('../../middleware/api-key.middleware');
const createApiKeyRoutes = require('../../../api-gateway/routes/api-key.routes');

describe('Audit Logging System E2E', () => {
  let mongoServer;
  let mongoClient;
  let app;
  let apiKeyService;
  let auditLogger;
  let alertService;
  let db;
  let request;

  const testConfig = {
    dbName: 'test_db',
    serviceName: 'test-service',
    retentionDays: 30,
    email: {
      enabled: true,
      from: 'test@test.com',
      to: ['admin@test.com']
    }
  };

  beforeAll(async () => {
    // Setup MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = await MongoClient.connect(uri);
    db = mongoClient.db(testConfig.dbName);

    // Initialize services
    apiKeyService = new ApiKeyService(testConfig);
    await apiKeyService.initialize(mongoClient);

    auditLogger = new AuditLoggerService(testConfig);
    await auditLogger.initialize(mongoClient);

    alertService = new AuditAlertService(testConfig);
    alertService.initialize(auditLogger);

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add API key middleware
    app.use('/api', createApiKeyMiddleware(apiKeyService));

    // Add API routes
    app.use('/api/keys', createApiKeyRoutes(apiKeyService));

    // Add test endpoints
    app.post('/api/test/sensitive', (req, res) => {
      auditLogger.log({
        eventType: 'SENSITIVE_DATA_ACCESS',
        userId: req.apiKey.userId,
        resourceType: 'test',
        severity: 'WARNING',
        metadata: {
          ip: req.ip,
          method: req.method,
          path: req.path
        }
      });
      res.json({ success: true });
    });

    request = supertest(app);
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await db.collection('apiKeys').deleteMany({});
    await db.collection('auditLogs').deleteMany({});
  });

  describe('Complete API Key Lifecycle', () => {
    it('should audit entire API key lifecycle', async () => {
      // 1. Generate API key
      const keyResponse = await request
        .post('/api/keys')
        .send({
          name: 'Test Key',
          permissions: ['read', 'write']
        });

      expect(keyResponse.status).toBe(201);
      const apiKey = keyResponse.body.data.key;

      // 2. Use API key to access sensitive endpoint
      const accessResponse = await request
        .post('/api/test/sensitive')
        .set('x-api-key', apiKey)
        .send({});

      expect(accessResponse.status).toBe(200);

      // 3. Rotate API key
      const rotateResponse = await request
        .post(`/api/keys/${keyResponse.body.data._id}/rotate`)
        .send({ currentKey: apiKey });

      expect(rotateResponse.status).toBe(200);
      const newApiKey = rotateResponse.body.data.newKey;

      // 4. Use both old and new keys during grace period
      const oldKeyResponse = await request
        .post('/api/test/sensitive')
        .set('x-api-key', apiKey)
        .send({});

      const newKeyResponse = await request
        .post('/api/test/sensitive')
        .set('x-api-key', newApiKey)
        .send({});

      expect(oldKeyResponse.status).toBe(200);
      expect(newKeyResponse.status).toBe(200);

      // 5. Revoke API key
      const revokeResponse = await request
        .post(`/api/keys/${keyResponse.body.data._id}/revoke`)
        .send({
          key: newApiKey,
          reason: 'testing'
        });

      expect(revokeResponse.status).toBe(200);

      // 6. Verify audit trail
      const auditLogs = await db.collection('auditLogs')
        .find({})
        .sort({ timestamp: 1 })
        .toArray();

      expect(auditLogs).toHaveLength(6); // Generate, 2x Access, Rotate, 2x Access during rotation, Revoke

      // Verify audit log contents
      expect(auditLogs.map(log => log.eventType)).toEqual([
        'API_KEY_GENERATED',
        'SENSITIVE_DATA_ACCESS',
        'API_KEY_ROTATED',
        'SENSITIVE_DATA_ACCESS',
        'SENSITIVE_DATA_ACCESS',
        'API_KEY_REVOKED'
      ]);
    });
  });

  describe('High Volume Audit Logging', () => {
    it('should handle concurrent audit events', async () => {
      // Generate API key
      const { body: { data: { key } } } = await request
        .post('/api/keys')
        .send({ name: 'Load Test Key' });

      // Simulate high volume of concurrent requests
      const numRequests = 100;
      const requests = Array(numRequests).fill().map(() =>
        request
          .post('/api/test/sensitive')
          .set('x-api-key', key)
          .send({})
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // Verify all requests succeeded
      expect(responses.every(r => r.status === 200)).toBe(true);

      // Verify audit logs were created
      const auditLogs = await db.collection('auditLogs')
        .find({ eventType: 'SENSITIVE_DATA_ACCESS' })
        .toArray();

      expect(auditLogs).toHaveLength(numRequests);
      console.log(`Processed ${numRequests} concurrent requests in ${endTime - startTime}ms`);
    });

    it('should maintain data consistency under load', async () => {
      const { body: { data: { key } } } = await request
        .post('/api/keys')
        .send({ name: 'Consistency Test Key' });

      // Simulate mixed workload
      const operations = [
        ...Array(50).fill().map(() => ({
          type: 'access',
          fn: () => request
            .post('/api/test/sensitive')
            .set('x-api-key', key)
            .send({})
        })),
        ...Array(10).fill().map(() => ({
          type: 'rotate',
          fn: () => request
            .post(`/api/keys/rotate`)
            .send({ currentKey: key })
        }))
      ];

      // Shuffle operations
      operations.sort(() => Math.random() - 0.5);

      // Execute operations
      const results = await Promise.all(
        operations.map(op => op.fn().catch(e => e))
      );

      // Verify audit logs
      const auditLogs = await db.collection('auditLogs').find({}).toArray();
      
      // Check log integrity
      expect(auditLogs.every(log => log.timestamp instanceof Date)).toBe(true);
      expect(auditLogs.every(log => log.eventId)).toBe(true);
      expect(auditLogs.every(log => log.userId)).toBe(true);
    });
  });

  describe('Audit Log Retention', () => {
    it('should enforce retention policy', async () => {
      // Insert audit logs with various dates
      const now = new Date();
      const testLogs = [
        {
          eventType: 'TEST',
          timestamp: new Date(now - 40 * 24 * 60 * 60 * 1000), // 40 days old
          severity: 'INFO'
        },
        {
          eventType: 'TEST',
          timestamp: new Date(now - 20 * 24 * 60 * 60 * 1000), // 20 days old
          severity: 'INFO'
        },
        {
          eventType: 'TEST',
          timestamp: now, // Current
          severity: 'INFO'
        }
      ];

      await db.collection('auditLogs').insertMany(testLogs);

      // Run cleanup
      await auditLogger.cleanupExpiredLogs();

      // Verify retention
      const remainingLogs = await db.collection('auditLogs').find({}).toArray();
      expect(remainingLogs).toHaveLength(2); // Only logs within retention period
    });
  });

  describe('Alert Integration', () => {
    it('should trigger alerts based on audit patterns', async () => {
      const alertSpy = jest.spyOn(alertService, '_sendAlert');

      // Generate suspicious pattern of events
      const suspiciousEvents = Array(10).fill().map(() => ({
        eventType: 'FAILED_LOGIN',
        severity: 'WARNING',
        userId: 'test-user',
        metadata: {
          ip: '192.168.1.1',
          reason: 'Invalid password'
        }
      }));

      // Log events rapidly
      await Promise.all(
        suspiciousEvents.map(event => auditLogger.log(event))
      );

      // Verify alert was triggered
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'WARNING'
        })
      );
    });
  });
}); 