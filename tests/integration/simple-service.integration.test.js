/**
 * Simple Integration Test that doesn't depend on external services
 */

const nock = require('nock');
// Import node-fetch instead of using global fetch
const fetch = require('node-fetch');

describe('Simple Service Integration', () => {
  beforeAll(() => {
    // Mock external API
    nock('http://external-service.example.com')
      .get('/api/data')
      .reply(200, { 
        success: true, 
        data: { message: 'Mocked response' } 
      });
  });
  
  afterAll(() => {
    nock.cleanAll();
  });
  
  test('should mock external service call', async () => {
    // Make a request to the mocked service
    const response = await fetch('http://external-service.example.com/api/data');
    const data = await response.json();
    
    // Assert
    expect(data).toHaveProperty('success', true);
    expect(data.data).toHaveProperty('message', 'Mocked response');
  });
}); 