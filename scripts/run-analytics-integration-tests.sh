#!/bin/bash

# Analytics Service Integration Test Script
set -e

# Configuration
MONGO_CONTAINER="spendsync-analytics-mongo-test"
REDIS_CONTAINER="spendsync-analytics-redis-test"
TEST_TIMEOUT=${TEST_TIMEOUT:-"60000"}
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-"80"}

echo "Starting Analytics Service Integration Tests..."

# Function to cleanup containers
cleanup() {
  echo "Cleaning up test containers..."
  docker rm -f $MONGO_CONTAINER $REDIS_CONTAINER 2>/dev/null || true
}

# Ensure cleanup on script exit
trap cleanup EXIT

# Start MongoDB container
echo "Starting MongoDB test container..."
docker run -d --name $MONGO_CONTAINER \
  -p 27018:27017 \
  mongo:4.4

# Start Redis container
echo "Starting Redis test container..."
docker run -d --name $REDIS_CONTAINER \
  -p 6380:6379 \
  redis:6.2

# Wait for containers to be ready
echo "Waiting for containers to be ready..."
sleep 5

# Set test environment variables
export MONGODB_URI="mongodb://localhost:27018/spendsync_analytics_test"
export REDIS_HOST="localhost"
export REDIS_PORT="6380"
export NODE_ENV="test"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run integration tests
echo "Running integration tests..."
jest \
  --config=jest.config.js \
  --testMatch="**/__tests__/integration/**/*.test.js" \
  --forceExit \
  --detectOpenHandles \
  --coverage \
  --coverageThreshold="{\"global\":{\"branches\":$COVERAGE_THRESHOLD,\"functions\":$COVERAGE_THRESHOLD,\"lines\":$COVERAGE_THRESHOLD,\"statements\":$COVERAGE_THRESHOLD}}" \
  --testTimeout=$TEST_TIMEOUT \
  --runInBand

# Check test results
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "Integration tests passed successfully!"
else
  echo "Integration tests failed with exit code $TEST_EXIT_CODE"
  exit $TEST_EXIT_CODE
fi

# Generate test report
echo "Generating test report..."
node <<EOF
const fs = require('fs');
const path = require('path');

const generateReport = () => {
  const coverageData = require('./coverage/coverage-final.json');
  const testResults = require('./test-results.json');

  const report = {
    timestamp: new Date().toISOString(),
    coverage: {
      statements: coverageData.total.statements.pct,
      branches: coverageData.total.branches.pct,
      functions: coverageData.total.functions.pct,
      lines: coverageData.total.lines.pct
    },
    tests: {
      total: testResults.numTotalTests,
      passed: testResults.numPassedTests,
      failed: testResults.numFailedTests,
      duration: testResults.testResults.reduce((acc, result) => acc + result.duration, 0)
    },
    slowestTests: testResults.testResults
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(test => ({
        name: test.name,
        duration: test.duration
      }))
  };

  if (!fs.existsSync('test-reports')) {
    fs.mkdirSync('test-reports');
  }

  fs.writeFileSync(
    path.join('test-reports', 'integration-test-report.json'),
    JSON.stringify(report, null, 2)
  );
};

generateReport();
EOF

echo "Test report generated at test-reports/integration-test-report.json" 