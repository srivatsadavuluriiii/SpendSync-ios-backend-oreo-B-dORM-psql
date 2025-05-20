const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const ApiKeyService = require('../api-key.service');

describe('ApiKeyService', () => {
  let mongoServer;
  let mongoClient;
  let apiKeyService;
  let db;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = await MongoClient.connect(uri);
    db = mongoClient.db('test');
    apiKeyService = new ApiKeyService(db);
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await db.collection('apiKeys').deleteMany({});
  });

  describe('generateKey', () => {
    it('should generate a new API key', async () => {
      const serviceId = 'test-service';
      const result = await apiKeyService.generateKey(serviceId);

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('expiresAt');
      expect(result.key).toHaveLength(64); // 32 bytes in hex = 64 characters

      // Check database record
      const keyDoc = await db.collection('apiKeys').findOne({ serviceId });
      expect(keyDoc).toBeTruthy();
      expect(keyDoc.isActive).toBe(true);
      expect(keyDoc.rotationStatus).toBe('current');
    });
  });

  describe('rotateKey', () => {
    it('should rotate an existing API key', async () => {
      const serviceId = 'test-service';
      const oldKey = await apiKeyService.generateKey(serviceId);
      const newKey = await apiKeyService.rotateKey(serviceId);

      expect(newKey.key).not.toBe(oldKey.key);

      // Check database records
      const keys = await db.collection('apiKeys').find({ serviceId }).toArray();
      expect(keys).toHaveLength(2);

      const deprecatedKey = keys.find(k => k.rotationStatus === 'deprecated');
      expect(deprecatedKey).toBeTruthy();
      expect(deprecatedKey.isActive).toBe(true);

      const currentKey = keys.find(k => k.rotationStatus === 'current');
      expect(currentKey).toBeTruthy();
      expect(currentKey.isActive).toBe(true);
    });
  });

  describe('validateKey', () => {
    it('should validate an active API key', async () => {
      const serviceId = 'test-service';
      const { key } = await apiKeyService.generateKey(serviceId);
      
      const isValid = await apiKeyService.validateKey(key);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid API key', async () => {
      const isValid = await apiKeyService.validateKey('invalid-key');
      expect(isValid).toBe(false);
    });

    it('should reject an expired API key', async () => {
      const serviceId = 'test-service';
      const { key } = await apiKeyService.generateKey(serviceId, -1); // Expired 1 day ago
      
      const isValid = await apiKeyService.validateKey(key);
      expect(isValid).toBe(false);
    });
  });

  describe('revokeKey', () => {
    it('should revoke an API key', async () => {
      const serviceId = 'test-service';
      const { key } = await apiKeyService.generateKey(serviceId);
      
      await apiKeyService.revokeKey(serviceId, key);

      const isValid = await apiKeyService.validateKey(key);
      expect(isValid).toBe(false);

      const keyDoc = await db.collection('apiKeys').findOne({ serviceId });
      expect(keyDoc.isActive).toBe(false);
      expect(keyDoc.revokedAt).toBeTruthy();
    });
  });

  describe('cleanupExpiredKeys', () => {
    it('should remove expired and old revoked keys', async () => {
      const serviceId = 'test-service';
      
      // Create expired key
      await apiKeyService.generateKey(serviceId, -30); // Expired 30 days ago
      
      // Create revoked key
      const { key } = await apiKeyService.generateKey(serviceId);
      await apiKeyService.revokeKey(serviceId, key);
      
      // Manually set revoked date to old date
      await db.collection('apiKeys').updateOne(
        { serviceId },
        { 
          $set: { 
            revokedAt: new Date(Date.now() - (31 * 24 * 60 * 60 * 1000)) // 31 days ago
          }
        }
      );

      await apiKeyService.cleanupExpiredKeys();

      const remainingKeys = await db.collection('apiKeys').find({ serviceId }).toArray();
      expect(remainingKeys).toHaveLength(0);
    });
  });
}); 