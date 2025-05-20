const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const nock = require('nock');
const ApiKeyService = require('../api-key.service');
const AuditAlertService = require('../alert.service');

describe('Alert System Integration', () => {
  let mongoServer;
  let mongoClient;
  let apiKeyService;
  let alertService;
  let emailTransport;
  let db;

  const testConfig = {
    dbName: 'test_db',
    email: {
      host: 'smtp.test.com',
      port: 587,
      auth: {
        user: 'test@test.com',
        pass: 'testpass'
      }
    },
    slack: {
      webhookUrl: 'https://hooks.slack.com/services/test'
    }
  };

  beforeAll(async () => {
    // Setup MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = await MongoClient.connect(uri);
    db = mongoClient.db(testConfig.dbName);

    // Setup mock email transport
    emailTransport = nodemailer.createTransport({
      name: 'test',
      version: '1.0.0',
      send: (mail, callback) => {
        callback(null, { response: 'ok' });
      }
    });

    // Initialize services
    apiKeyService = new ApiKeyService(testConfig);
    await apiKeyService.initialize(mongoClient);

    alertService = new AuditAlertService(testConfig);
    alertService.emailTransporter = emailTransport;
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await db.collection('apiKeys').deleteMany({});
    await db.collection('auditLogs').deleteMany({});
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('Email Alerts', () => {
    it('should send email alert for critical events', async () => {
      const sendMailSpy = jest.spyOn(emailTransport, 'sendMail');

      const criticalEvent = {
        eventType: 'SECURITY_BREACH',
        severity: 'CRITICAL',
        userId: 'user123',
        description: 'Unauthorized access attempt',
        metadata: {
          ip: '192.168.1.1',
          location: 'Unknown'
        }
      };

      await alertService._handleCriticalEvent(criticalEvent);

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('[ALERT]'),
          html: expect.stringContaining('SECURITY_BREACH')
        })
      );
    });

    it('should handle email sending failures gracefully', async () => {
      const error = new Error('SMTP error');
      emailTransport.sendMail = jest.fn().mockRejectedValue(error);

      const criticalEvent = {
        eventType: 'SYSTEM_ERROR',
        severity: 'CRITICAL',
        description: 'Database connection failed'
      };

      await expect(alertService._handleCriticalEvent(criticalEvent))
        .resolves
        .not
        .toThrow();
    });
  });

  describe('Slack Alerts', () => {
    it('should send Slack alert for critical events', async () => {
      const slackMock = nock('https://hooks.slack.com')
        .post('/services/test')
        .reply(200, 'ok');

      const criticalEvent = {
        eventType: 'API_KEY_BREACH',
        severity: 'CRITICAL',
        userId: 'user123',
        description: 'Multiple failed API key attempts',
        metadata: {
          attempts: 5,
          timeWindow: '5 minutes'
        }
      };

      await alertService._handleCriticalEvent(criticalEvent);

      expect(slackMock.isDone()).toBe(true);
    });

    it('should handle Slack API failures gracefully', async () => {
      nock('https://hooks.slack.com')
        .post('/services/test')
        .replyWithError('Slack API error');

      const criticalEvent = {
        eventType: 'SYSTEM_ERROR',
        severity: 'CRITICAL',
        description: 'Service unavailable'
      };

      await expect(alertService._handleCriticalEvent(criticalEvent))
        .resolves
        .not
        .toThrow();
    });
  });

  describe('Alert Thresholds', () => {
    it('should trigger alert when threshold is exceeded', async () => {
      const sendMailSpy = jest.spyOn(emailTransport, 'sendMail');
      
      // Set threshold for failed logins
      alertService.alertThresholds.failedLogins = 3;

      // Simulate multiple failed login attempts
      for (let i = 0; i < 4; i++) {
        await alertService._handleAuditEvent({
          eventType: 'AUTH_FAILED',
          userId: 'user123',
          status: 'failure',
          metadata: {
            ip: '192.168.1.1',
            attempt: i + 1
          }
        });
      }

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Failed Login Attempts'),
          html: expect.stringContaining('threshold reached')
        })
      );
    });

    it('should reset threshold counter after window expires', async () => {
      const sendMailSpy = jest.spyOn(emailTransport, 'sendMail');
      
      alertService.alertThresholds.apiErrors = 2;
      alertService.alertCounts.clear();

      // Simulate API errors with delay
      await alertService._handleAuditEvent({
        eventType: 'API_ERROR',
        status: 'failure'
      });

      // Fast-forward time
      jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour

      await alertService._handleAuditEvent({
        eventType: 'API_ERROR',
        status: 'failure'
      });

      expect(sendMailSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration with API Key Service', () => {
    it('should alert on multiple API key failures', async () => {
      const sendMailSpy = jest.spyOn(emailTransport, 'sendMail');
      
      // Generate an API key
      const { key } = await apiKeyService.generateKey({
        userId: 'user123',
        name: 'Test Key'
      });

      // Simulate multiple failed validations
      for (let i = 0; i < 5; i++) {
        await apiKeyService.validateKey('invalid_key_' + i);
      }

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('API Key'),
          html: expect.stringContaining('multiple failed attempts')
        })
      );
    });

    it('should alert on suspicious key rotation patterns', async () => {
      const slackMock = nock('https://hooks.slack.com')
        .post('/services/test')
        .reply(200, 'ok');

      // Generate and rotate keys multiple times
      const keys = await Promise.all(
        Array(3).fill().map(() => 
          apiKeyService.generateKey({
            userId: 'user123',
            name: 'Test Key'
          })
        )
      );

      // Rotate all keys in quick succession
      await Promise.all(
        keys.map(k => apiKeyService.rotateKey(k.key))
      );

      expect(slackMock.isDone()).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume of events', async () => {
      const events = Array(1000).fill().map((_, i) => ({
        eventType: 'HTTP_REQUEST',
        severity: i % 10 === 0 ? 'ERROR' : 'INFO',
        userId: `user${i % 10}`,
        status: i % 5 === 0 ? 'failure' : 'success'
      }));

      const startTime = Date.now();
      await Promise.all(
        events.map(event => alertService._handleAuditEvent(event))
      );
      const endTime = Date.now();

      console.log(`Processed 1000 events in ${endTime - startTime}ms`);
      expect(endTime - startTime).toBeLessThan(5000); // Should process within 5 seconds
    });

    it('should maintain alert accuracy under load', async () => {
      const sendMailSpy = jest.spyOn(emailTransport, 'sendMail');
      alertService.alertThresholds.apiErrors = 50;

      // Generate 100 API errors rapidly
      const errors = Array(100).fill().map((_, i) => ({
        eventType: 'API_ERROR',
        severity: 'ERROR',
        status: 'failure',
        metadata: { errorId: i }
      }));

      await Promise.all(
        errors.map(error => alertService._handleAuditEvent(error))
      );

      // Should trigger exactly 2 alerts (at 50 and 100 errors)
      expect(sendMailSpy).toHaveBeenCalledTimes(2);
    });
  });
}); 