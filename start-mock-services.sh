#!/bin/bash

# SpendSync Mock Services Startup Script
# This script starts all mock services for development and testing

echo "Starting SpendSync Mock Services..."

# Set environment variables for Supabase Auth
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-supabase-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
export NODE_ENV=development
export PORT=4000

# Service URLs
export USER_SERVICE_URL=http://localhost:3001
export EXPENSE_SERVICE_URL=http://localhost:3002
export SETTLEMENT_SERVICE_URL=http://localhost:3003
export NOTIFICATION_SERVICE_URL=http://localhost:3004
export PAYMENT_SERVICE_URL=http://localhost:3005
export ANALYTICS_SERVICE_URL=http://localhost:3006

# Start mock services
echo "Starting mock services..."
node scripts/mock-services.js &
MOCK_PID=$!

# Start API Gateway
echo "Starting API Gateway..."
node src/api-gateway/index.js &
GATEWAY_PID=$!

# Function to cleanup processes on exit
cleanup() {
    echo "Shutting down services..."
    kill $MOCK_PID 2>/dev/null
    kill $GATEWAY_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script termination
trap cleanup SIGINT SIGTERM

echo "All services started successfully!"
echo "API Gateway: http://localhost:4000"
echo "Mock Services: http://localhost:3001-3006"
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait 