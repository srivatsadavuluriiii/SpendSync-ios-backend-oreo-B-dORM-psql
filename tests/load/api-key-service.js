import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const failureRate = new Rate('failed_requests');

// Test configuration
export const options = {
  scenarios: {
    // Normal load test
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up
        { duration: '5m', target: 50 },  // Stay at peak
        { duration: '2m', target: 0 }    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    
    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '3m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s',
      startTime: '10m',
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 0 }
      ],
      startTime: '20m',
    },
    
    // Soak test
    soak_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '2h',
      startTime: '25m',
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
    failed_requests: ['rate<0.05'],    // Custom failure rate threshold
  },
};

// Shared parameters
const BASE_URL = __ENV.API_URL || 'https://api.spendsync.com';
const API_KEY = __ENV.API_KEY || 'test_key';

// Helper functions
function generateRandomString(length) {
  return Math.random().toString(36).substring(2, length + 2);
}

// Main test scenarios
export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  // Group 1: API Key Generation
  {
    const payload = JSON.stringify({
      name: `Load Test Key ${generateRandomString(8)}`,
      expiresInDays: 30,
      permissions: ['read', 'write']
    });

    const response = check(http.post(`${BASE_URL}/api/keys`, payload, {
      headers: headers
    }), {
      'key generation successful': (r) => r.status === 201,
      'key generation time OK': (r) => r.timings.duration < 500
    });

    failureRate.add(!response);
    sleep(1);
  }

  // Group 2: API Key Validation
  {
    const response = check(http.get(`${BASE_URL}/api/keys/validate`, {
      headers: headers
    }), {
      'key validation successful': (r) => r.status === 200,
      'validation time OK': (r) => r.timings.duration < 200
    });

    failureRate.add(!response);
    sleep(0.5);
  }

  // Group 3: API Key Rotation
  if (Math.random() < 0.1) { // 10% of iterations perform rotation
    const response = check(http.post(`${BASE_URL}/api/keys/rotate`, {
      headers: headers
    }), {
      'key rotation successful': (r) => r.status === 200,
      'rotation time OK': (r) => r.timings.duration < 1000
    });

    failureRate.add(!response);
    sleep(2);
  }

  // Group 4: Concurrent API Key Operations
  {
    const responses = http.batch([
      ['GET', `${BASE_URL}/api/keys`, null, { headers }],
      ['GET', `${BASE_URL}/api/keys/validate`, null, { headers }],
      ['GET', `${BASE_URL}/api/keys/metrics`, null, { headers }]
    ]);

    const batchCheck = check(responses[0], {
      'batch operations successful': (r) => r.status === 200,
      'batch response time OK': (r) => r.timings.duration < 1000
    });

    failureRate.add(!batchCheck);
    sleep(1);
  }

  // Random errors simulation
  if (Math.random() < 0.05) { // 5% error rate simulation
    http.get(`${BASE_URL}/api/keys/invalid-endpoint`, {
      headers: headers
    });
    sleep(0.1);
  }
} 