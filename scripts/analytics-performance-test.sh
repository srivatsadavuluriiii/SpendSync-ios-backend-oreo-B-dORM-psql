#!/bin/bash

# Analytics Service Performance Test Script
set -e

# Configuration
SERVICE_URL=${ANALYTICS_SERVICE_URL:-"http://localhost:3005"}
TEST_DURATION=${TEST_DURATION:-"300"} # 5 minutes
CONCURRENT_USERS=${CONCURRENT_USERS:-"50"}
RAMP_UP=${RAMP_UP:-"30"} # 30 seconds
OUTPUT_DIR="./performance-results/analytics"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Starting Analytics Service Performance Tests..."
echo "Service URL: $SERVICE_URL"
echo "Test Duration: $TEST_DURATION seconds"
echo "Concurrent Users: $CONCURRENT_USERS"
echo "Ramp Up Period: $RAMP_UP seconds"

# Function to check if service is ready
check_service() {
  for i in {1..30}; do
    if curl -s "$SERVICE_URL/health" | grep -q "UP"; then
      echo "Service is ready!"
      return 0
    fi
    echo "Waiting for service to be ready... ($i/30)"
    sleep 2
  done
  echo "Service failed to become ready"
  exit 1
}

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  echo "k6 is not installed. Please install it first:"
  echo "brew install k6"
  exit 1
fi

# Check service health
check_service

# Run performance tests
echo "Running performance tests..."

# Test Scenarios:
# 1. Spending Analytics
k6 run --out json="$OUTPUT_DIR/spending-results.json" - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '${RAMP_UP}s', target: ${CONCURRENT_USERS} },
    { duration: '${TEST_DURATION}s', target: ${CONCURRENT_USERS} },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01']
  }
};

export default function() {
  const url = '${SERVICE_URL}/analytics/spending';
  const payload = {
    timeSeriesData: Array.from({ length: 100 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      value: Math.random() * 1000,
      type: Math.random() > 0.5 ? 'A' : 'B'
    }))
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    }
  };

  const res = http.post(url, JSON.stringify(payload), params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });

  sleep(1);
}
EOF

# 2. Cache Performance
k6 run --out json="$OUTPUT_DIR/cache-results.json" - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '${RAMP_UP}s', target: ${CONCURRENT_USERS} },
    { duration: '${TEST_DURATION}s', target: ${CONCURRENT_USERS} },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01']
  }
};

export default function() {
  const url = '${SERVICE_URL}/analytics/insights';
  const params = {
    headers: {
      'Authorization': 'Bearer test-token'
    }
  };

  // First request should cache the result
  let res = http.get(url, params);
  check(res, {
    'status is 200': (r) => r.status === 200
  });

  sleep(0.5);

  // Second request should use cache
  res = http.get(url, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100
  });

  sleep(0.5);
}
EOF

# 3. Data Processing Performance
k6 run --out json="$OUTPUT_DIR/processing-results.json" - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '${RAMP_UP}s', target: ${CONCURRENT_USERS} },
    { duration: '${TEST_DURATION}s', target: ${CONCURRENT_USERS} },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01']
  }
};

export default function() {
  const url = '${SERVICE_URL}/analytics/predictions';
  const payload = {
    timeSeriesData: Array.from({ length: 1000 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      value: Math.random() * 1000,
      type: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
    }))
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    }
  };

  const res = http.post(url, JSON.stringify(payload), params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000
  });

  sleep(2);
}
EOF

# Generate performance report
echo "Generating performance report..."
node <<EOF
const fs = require('fs');
const path = require('path');

const generateReport = () => {
  const results = {
    spending: require('${OUTPUT_DIR}/spending-results.json'),
    cache: require('${OUTPUT_DIR}/cache-results.json'),
    processing: require('${OUTPUT_DIR}/processing-results.json')
  };

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      spending: {
        avgResponseTime: results.spending.metrics.http_req_duration.avg,
        p95ResponseTime: results.spending.metrics.http_req_duration.p95,
        errorRate: results.spending.metrics.http_req_failed.rate
      },
      cache: {
        avgResponseTime: results.cache.metrics.http_req_duration.avg,
        p95ResponseTime: results.cache.metrics.http_req_duration.p95,
        errorRate: results.cache.metrics.http_req_failed.rate
      },
      processing: {
        avgResponseTime: results.processing.metrics.http_req_duration.avg,
        p95ResponseTime: results.processing.metrics.http_req_duration.p95,
        errorRate: results.processing.metrics.http_req_failed.rate
      }
    }
  };

  fs.writeFileSync(
    path.join('${OUTPUT_DIR}', 'performance-report.json'),
    JSON.stringify(report, null, 2)
  );
};

generateReport();
EOF

echo "Performance tests completed!"
echo "Results available in: $OUTPUT_DIR" 