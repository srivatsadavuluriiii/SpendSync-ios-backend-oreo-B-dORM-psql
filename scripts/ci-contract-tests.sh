#!/bin/bash

# CI Contract Tests Script
# This script is designed to run in a CI environment to execute contract tests

set -e

echo "🔍 Running SpendSync Contract Tests in CI"
echo "========================================"

# Determine CI environment
if [ "$CI" = "true" ]; then
  echo "✅ Running in CI environment"
else
  echo "⚠️ Not running in a CI environment, but proceeding anyway"
fi

# Function to run tests with Docker
run_with_docker() {
  echo "🐳 Running tests using Docker..."
  
  # Build the Docker image for contract tests
  docker build -f docker/pact-arm64.Dockerfile -t spendsync/contract-tests .
  
  # Run the tests
  docker run \
    -v "$(pwd)/pacts:/app/pacts" \
    -v "$(pwd)/logs:/app/logs" \
    -e "NODE_ENV=test" \
    spendsync/contract-tests
    
  # Check if pact files were created
  if [ "$(ls -A pacts)" ]; then
    echo "✅ Pact files generated successfully"
  else
    echo "❌ No pact files were generated, there may be an issue with the tests"
    exit 1
  fi
}

# Function to run tests directly on host
run_native() {
  echo "🧪 Running tests directly on CI host..."
  npm run test:contract
  
  # Check if pact files were created
  if [ "$(ls -A pacts)" ]; then
    echo "✅ Pact files generated successfully"
  else
    echo "❌ No pact files were generated, there may be an issue with the tests"
    exit 1
  fi
}

# Function to publish pacts to broker if available
publish_pacts() {
  if [ -n "$PACT_BROKER_URL" ]; then
    echo "📦 Publishing pacts to broker at $PACT_BROKER_URL"
    
    # Check if we should use authentication
    if [ -n "$PACT_BROKER_TOKEN" ]; then
      AUTH_ARGS="--broker-token $PACT_BROKER_TOKEN"
    elif [ -n "$PACT_BROKER_USERNAME" ] && [ -n "$PACT_BROKER_PASSWORD" ]; then
      AUTH_ARGS="--broker-username $PACT_BROKER_USERNAME --broker-password $PACT_BROKER_PASSWORD"
    else
      AUTH_ARGS=""
    fi
    
    # Publish the pacts
    npx pact-broker publish pacts/ \
      --broker-base-url $PACT_BROKER_URL \
      --consumer-app-version $CI_COMMIT_SHA \
      $AUTH_ARGS
      
    echo "✅ Pacts published to broker"
  else
    echo "ℹ️ No PACT_BROKER_URL provided, skipping publication"
  fi
}

# Main execution logic
echo "🚀 Starting contract tests..."

# Use Docker by default in CI
run_with_docker

# Check for existing pact files and publish them
if [ "$(ls -A pacts)" ]; then
  publish_pacts
fi

echo "✅ Contract tests completed successfully"
exit 0 