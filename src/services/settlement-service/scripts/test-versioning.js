/**
 * API Versioning Test Script
 * 
 * This script tests the API versioning functionality by making requests
 * with different versioning methods.
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  host: 'localhost',
  port: 3003,
  // Add a valid token for testing authenticated endpoints
  token: 'YOUR_AUTH_TOKEN',
  endpoints: [
    '/api/v1/settlements', // Path versioning
    '/api/settlements',    // No version (should default to v1)
    '/api/v2/settlements'  // Unsupported version
  ]
};

/**
 * Make an HTTP request with different versioning methods
 * @param {string} endpoint - API endpoint to test
 * @param {string} versionHeader - Optional version header to use
 * @returns {Promise<Object>} - Response data
 */
function makeRequest(endpoint, versionHeader = null) {
  return new Promise((resolve, reject) => {
    const options = {
      host: config.host,
      port: config.port,
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`
      }
    };

    // Add version headers if specified
    if (versionHeader === 'accept') {
      options.headers['Accept'] = 'application/vnd.spendsync.v1+json';
    } else if (versionHeader === 'custom') {
      options.headers['X-API-Version'] = 'v1';
    }

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: data.length > 0 ? JSON.parse(data) : null
          };
          resolve(responseData);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Run the versioning tests
 */
async function runTests() {
  console.log('API Versioning Test Script\n');
  console.log('=================================================');
  
  try {
    // Test 1: Path versioning
    console.log('\nTest 1: Path Versioning - /api/v1/settlements');
    const pathVersionResult = await makeRequest('/api/v1/settlements');
    console.log(`Status: ${pathVersionResult.statusCode}`);
    console.log(`Version Header: ${pathVersionResult.headers['x-api-version']}`);
    
    // Test 2: No version (should default to v1)
    console.log('\nTest 2: Default Version - /api/settlements');
    const defaultVersionResult = await makeRequest('/api/settlements');
    console.log(`Status: ${defaultVersionResult.statusCode}`);
    console.log(`Version Header: ${defaultVersionResult.headers['x-api-version']}`);
    
    // Test 3: Custom header versioning
    console.log('\nTest 3: Custom Header Versioning - X-API-Version: v1');
    const customHeaderResult = await makeRequest('/api/settlements', 'custom');
    console.log(`Status: ${customHeaderResult.statusCode}`);
    console.log(`Version Header: ${customHeaderResult.headers['x-api-version']}`);
    
    // Test 4: Accept header versioning
    console.log('\nTest 4: Accept Header Versioning - application/vnd.spendsync.v1+json');
    const acceptHeaderResult = await makeRequest('/api/settlements', 'accept');
    console.log(`Status: ${acceptHeaderResult.statusCode}`);
    console.log(`Version Header: ${acceptHeaderResult.headers['x-api-version']}`);
    
    // Test 5: Unsupported version
    console.log('\nTest 5: Unsupported Version - /api/v2/settlements');
    try {
      const unsupportedVersionResult = await makeRequest('/api/v2/settlements');
      console.log(`Status: ${unsupportedVersionResult.statusCode}`);
      console.log(`Response: ${JSON.stringify(unsupportedVersionResult.data)}`);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    
    console.log('\n=================================================');
    console.log('Tests completed!');
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 