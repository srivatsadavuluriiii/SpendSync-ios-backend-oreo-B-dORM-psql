/**
 * Basic settlement integration test
 */

const express = require('express');
const request = require('supertest');
const bodyParser = require('body-parser');

// Create a simple express app for testing
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set Content-Type header for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Mock settlement endpoints
app.get('/api/v1/settlements/:settlementId', (req, res) => {
  const settlementId = req.params.settlementId;
  
  if (settlementId === 'not-found') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'SETTLEMENT_NOT_FOUND',
        message: 'Settlement not found'
      }
    });
  }
  
  res.json({
    success: true,
    data: {
      id: settlementId,
      payerId: 'user1',
      receiverId: 'user2',
      amount: 50,
      currency: 'USD',
      status: 'pending',
      groupId: 'group1',
      createdAt: new Date().toISOString()
    }
  });
});

app.get('/api/v1/settlements/group/:groupId', (req, res) => {
  const groupId = req.params.groupId;
  
  res.json({
    success: true,
    data: {
      settlements: [
        {
          id: 'settlement1',
          payerId: 'user1',
          receiverId: 'user2',
          amount: 50,
          currency: 'USD',
          status: 'pending',
          groupId,
          createdAt: new Date().toISOString()
        },
        {
          id: 'settlement2',
          payerId: 'user3',
          receiverId: 'user4',
          amount: 25,
          currency: 'USD',
          status: 'completed',
          groupId,
          createdAt: new Date().toISOString()
        }
      ],
      total: 2
    }
  });
});

app.post('/api/v1/settlements', (req, res) => {
  const { payerId, receiverId, amount, currency, groupId } = req.body;
  
  if (!payerId || !receiverId || !amount || !groupId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields'
      }
    });
  }
  
  res.status(201).json({
    success: true,
    data: {
      id: 'new-settlement',
      payerId,
      receiverId,
      amount,
      currency: currency || 'USD',
      status: 'pending',
      groupId,
      createdAt: new Date().toISOString()
    }
  });
});

describe('Settlement Service Integration', () => {
  test('should retrieve a settlement by ID', async () => {
    const response = await request(app)
      .get('/api/v1/settlements/settlement1')
      .expect('Content-Type', /json/)
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id', 'settlement1');
    expect(response.body.data).toHaveProperty('payerId', 'user1');
    expect(response.body.data).toHaveProperty('receiverId', 'user2');
  });
  
  test('should return 404 for non-existent settlement', async () => {
    const response = await request(app)
      .get('/api/v1/settlements/not-found')
      .expect('Content-Type', /json/)
      .expect(404);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('code', 'SETTLEMENT_NOT_FOUND');
  });
  
  test('should retrieve settlements for a group', async () => {
    const response = await request(app)
      .get('/api/v1/settlements/group/group1')
      .expect('Content-Type', /json/)
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('settlements');
    expect(Array.isArray(response.body.data.settlements)).toBe(true);
    expect(response.body.data.settlements).toHaveLength(2);
  });
  
  test('should create a new settlement', async () => {
    const settlementData = {
      payerId: 'user1',
      receiverId: 'user2',
      amount: 50,
      currency: 'USD',
      groupId: 'group1'
    };
    
    const response = await request(app)
      .post('/api/v1/settlements')
      .send(settlementData)
      .expect('Content-Type', /json/)
      .expect(201);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('payerId', 'user1');
    expect(response.body.data).toHaveProperty('receiverId', 'user2');
    expect(response.body.data).toHaveProperty('amount', 50);
  });
  
  test('should return 400 for missing required fields', async () => {
    const invalidData = {
      payerId: 'user1',
      // Missing receiverId
      amount: 50
      // Missing groupId
    };
    
    const response = await request(app)
      .post('/api/v1/settlements')
      .send(invalidData)
      .expect('Content-Type', /json/)
      .expect(400);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
}); 