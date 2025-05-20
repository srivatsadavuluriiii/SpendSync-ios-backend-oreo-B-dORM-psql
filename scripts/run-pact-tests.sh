#!/bin/bash

# Run Pact tests script for SpendSync
# This script handles running Pact tests on ARM64 architecture using Docker or Rosetta 2

set -e

echo "🔍 Running SpendSync Pact Contract Tests"
echo "========================================"

# Determine if we're running on ARM64 architecture
ARCH=$(uname -m)
IS_ARM64=false
if [ "$ARCH" = "arm64" ]; then
    IS_ARM64=true
    echo "✅ Detected ARM64 architecture"
else
    echo "✅ Detected $ARCH architecture"
fi

# Check if Docker is available
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    DOCKER_AVAILABLE=true
    echo "✅ Docker is available and running"
else
    DOCKER_AVAILABLE=false
    echo "❌ Docker not found or not running, will attempt to run tests locally"
fi

# Check if Rosetta 2 is available (for ARM64 Macs)
if [ "$IS_ARM64" = true ] && [ -f /usr/bin/arch ]; then
    ROSETTA_AVAILABLE=true
    echo "✅ Rosetta 2 is available"
else
    ROSETTA_AVAILABLE=false
    if [ "$IS_ARM64" = true ]; then
        echo "❌ Rosetta 2 not detected"
    fi
fi

# Function to run tests with Docker
run_with_docker() {
    echo "🐳 Running tests using Docker (AMD64 emulation)..."
    docker-compose -f docker-compose.pact.arm64.yml up --build
}

# Function to run tests with Rosetta 2
run_with_rosetta() {
    echo "🖥️  Running tests using Rosetta 2 (x86_64 translation)..."
    arch -x86_64 npm run test:contract
}

# Function to run tests locally (native)
run_locally() {
    echo "🧪 Running tests natively..."
    npm run test:contract
}

# Main execution logic
if [ "$IS_ARM64" = true ]; then
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo "🔥 Using Docker with AMD64 emulation for ARM64 compatibility"
        run_with_docker
    elif [ "$ROSETTA_AVAILABLE" = true ]; then
        echo "🔥 Using Rosetta 2 for ARM64 compatibility"
        run_with_rosetta
    else
        echo "⚠️  WARNING: Running on ARM64 without compatibility layer may cause issues"
        run_locally
    fi
else
    echo "🧪 Running tests directly on x86_64 host machine"
    run_locally
fi

echo "✅ Pact tests completed"
exit 0 