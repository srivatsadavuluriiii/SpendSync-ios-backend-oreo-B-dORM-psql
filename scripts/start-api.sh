#!/bin/bash

# Set environment variables
export JWT_SECRET="spendsync-dev-jwt-secret"
export PORT=4040
export NODE_ENV=development
export MONGODB_URI="mongodb://localhost:27017/spendsync"
export REDIS_HOST="localhost"
export REDIS_PORT=6379
export USER_SERVICE_URL="http://localhost:4001"
export EXPENSE_SERVICE_URL="http://localhost:4002"
export SETTLEMENT_SERVICE_URL="http://localhost:4003"
export NOTIFICATION_SERVICE_URL="http://localhost:4004"
export PAYMENT_SERVICE_URL="http://localhost:4005"
export ANALYTICS_SERVICE_URL="http://localhost:4006"
export STRIPE_SECRET_KEY="sk_test_12345"
export STRIPE_WEBHOOK_SECRET="whsec_12345"

# Start the API gateway with garbage collection enabled for better memory management
node --expose-gc src/api-gateway/index.js 