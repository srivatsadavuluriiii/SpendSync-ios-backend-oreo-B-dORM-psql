const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const ApiKeyService = require('../api-key.service');

describe('ApiKeyService', () => {
  let mongoServer;
  let mongoClient;
  let apiKeyService;
  let db;

  const testConfig = {
    dbName: 'test_db',
    defaultExpiryDays: 30,
    rotationGracePeriodDays: 7
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = await MongoClient.connect(uri);
    db = mongoClient.db(testConfig.dbName);
    
    apiKeyService = new ApiKeyService(testConfig);
    await apiKeyService.initialize(mongoClient);
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await db.collection('apiKeys').deleteMany({});
  });

  describe('generateKey', () => {
    it('should generate a new API key with default options', async () => {
      const options = {
        userId: 'user123',
        name: 'Test Key'
      };

      const keyDetails = await apiKeyService.generateKey(options);

      expect(keyDetails).toMatchObject({
        userId: options.userId,
        name: options.name,
        permissions: ['read'],
        status: 'active'
      });
      expect(keyDetails.key).toMatch(/^sk_/);
      expect(keyDetails._id).toBeDefined();
    });

    it('should generate a key with custom permissions and metadata', async () => {
      const options = {
        userId: 'user123',
        name: 'Test Key',
        permissions: ['read', 'write'],
        metadata: { environment: 'test' }
      };

      const keyDetails = await apiKeyService.generateKey(options);

      expect(keyDetails.permissions).toEqual(['read', 'write']);
      expect(keyDetails.metadata).toEqual({ environment: 'test' });
    });

    it('should set correct expiration date', async () => {
      const expiresInDays = 7;
      const keyDetails = await apiKeyService.generateKey({
        userId: 'user123',
        name: 'Test Key',
        expiresInDays
      });

      const expectedExpiry = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      expect(keyDetails.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
    });
  });

  describe('validateKey', () => {
    let testKey;

    beforeEach(async () => {
      const keyDetails = await apiKeyService.generateKey({
        userId: 'user123',
        name: 'Test Key'
      });
      testKey = keyDetails.key;
    });

    it('should validate a valid key', async () => {
      const result = await apiKeyService.validateKey(testKey);
      expect(result).toBeTruthy();
      expect(result.userId).toBe('user123');
      expect(result.status).toBe('active');
    });

    it('should return null for invalid key', async () => {
      const result = await apiKeyService.validateKey('invalid_key');
      expect(result).toBeNull();
    });

    it('should update lastUsedAt timestamp', async () => {
      const before = new Date();
      const result = await apiKeyService.validateKey(testKey);
      expect(result.lastUsedAt).toBeInstanceOf(Date);
      expect(result.lastUsedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should validate key in rotation period', async () => {
      // First rotate the key
      const { key: newKey } = await apiKeyService.rotateKey(testKey);
      
      // Both old and new keys should be valid during rotation
      const oldKeyResult = await apiKeyService.validateKey(testKey);
      const newKeyResult = await apiKeyService.validateKey(newKey);
      
      expect(oldKeyResult).toBeTruthy();
      expect(newKeyResult).toBeTruthy();
      expect(oldKeyResult.status).toBe('rotating');
      expect(newKeyResult.status).toBe('rotating');
    });
  });

  describe('rotateKey', () => {
    let testKey;

    beforeEach(async () => {
      const keyDetails = await apiKeyService.generateKey({
        userId: 'user123',
        name: 'Test Key'
      });
      testKey = keyDetails.key;
    });

    it('should rotate a key successfully', async () => {
      const result = await apiKeyService.rotateKey(testKey);
      
      expect(result.key).toBeDefined();
      expect(result.key).not.toBe(testKey);
      expect(result.status).toBe('rotating');
      expect(result.rotationExpiresAt).toBeDefined();
      expect(result.previousKey).toBeDefined();
    });

    it('should fail to rotate invalid key', async () => {
      await expect(apiKeyService.rotateKey('invalid_key'))
        .rejects
        .toThrow('Invalid or inactive API key');
    });

    it('should fail to rotate already rotated key', async () => {
      await apiKeyService.rotateKey(testKey);
      await expect(apiKeyService.rotateKey(testKey))
        .rejects
        .toThrow('Invalid or inactive API key');
    });
  });

  describe('revokeKey', () => {
    let testKey;

    beforeEach(async () => {
      const keyDetails = await apiKeyService.generateKey({
        userId: 'user123',
        name: 'Test Key'
      });
      testKey = keyDetails.key;
    });

    it('should revoke a key successfully', async () => {
      await apiKeyService.revokeKey(testKey, 'test revocation');
      
      const keyDoc = await db.collection('apiKeys').findOne({
        key: apiKeyService._hashKey(testKey)
      });

      expect(keyDoc.status).toBe('revoked');
      expect(keyDoc.revokedAt).toBeDefined();
      expect(keyDoc.revocationReason).toBe('test revocation');
    });

    it('should fail to revoke invalid key', async () => {
      await expect(apiKeyService.revokeKey('invalid_key'))
        .rejects
        .toThrow('Invalid API key');
    });

    it('should fail to validate revoked key', async () => {
      await apiKeyService.revokeKey(testKey);
      const result = await apiKeyService.validateKey(testKey);
      expect(result).toBeNull();
    });
  });

  describe('cleanupKeys', () => {
    beforeEach(async () => {
      // Create expired key
      const expiredKey = await apiKeyService.generateKey({
        userId: 'user123',
        name: 'Expired Key',
        expiresInDays: -1 // Expired yesterday
      });

      // Create rotated key past grace period
      const rotatedKey = await apiKeyService.generateKey({
        userId: 'user123',
        name: 'Rotated Key'
      });
      await apiKeyService.rotateKey(rotatedKey.key);
      
      // Manually set rotation expiry to past
      await db.collection('apiKeys').updateOne(
        { key: apiKeyService._hashKey(rotatedKey.key) },
        { 
          $set: { 
            rotationExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      );
    });

    it('should cleanup expired and rotated keys', async () => {
      await apiKeyService.cleanupKeys();

      const remainingKeys = await db.collection('apiKeys').find({}).toArray();
      
      // Should only have active keys remaining
      expect(remainingKeys.every(key => key.status === 'active')).toBe(true);
      expect(remainingKeys.every(key => !key.previousKey)).toBe(true);
      expect(remainingKeys.every(key => key.expiresAt > new Date())).toBe(true);
    });
  });

  describe('performance tests', () => {
    it('should handle bulk key generation', async () => {
      const promises = Array(100).fill().map((_, i) => 
        apiKeyService.generateKey({
          userId: 'user123',
          name: `Bulk Key ${i}`
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      expect(results.every(r => r.key.startsWith('sk_'))).toBe(true);
    });

    it('should handle concurrent key validations', async () => {
      // First generate some keys
      const keys = await Promise.all(
        Array(50).fill().map((_, i) => 
          apiKeyService.generateKey({
            userId: 'user123',
            name: `Concurrent Key ${i}`
          })
        )
      );

      // Then validate them concurrently
      const startTime = Date.now();
      const validations = await Promise.all(
        keys.map(k => apiKeyService.validateKey(k.key))
      );
      const endTime = Date.now();

      expect(validations).toHaveLength(50);
      expect(validations.every(v => v !== null)).toBe(true);
      
      // Log performance metrics
      console.log(`Concurrent validation time: ${endTime - startTime}ms`);
    });
  });
}); 