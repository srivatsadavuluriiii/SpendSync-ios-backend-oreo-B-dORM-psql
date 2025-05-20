#!/bin/bash

# Set environment variables
export JWT_SECRET=development-secret-key
export NODE_ENV=development
export PORT=4000
export USER_SERVICE_URL=http://localhost:3001
export EXPENSE_SERVICE_URL=http://localhost:3002
export SETTLEMENT_SERVICE_URL=http://localhost:3003
export NOTIFICATION_SERVICE_URL=http://localhost:3004
export ANALYTICS_SERVICE_URL=http://localhost:3005
export PAYMENT_SERVICE_URL=http://localhost:3006

# Memory optimization settings
export ALERT_THRESHOLD_MEMORY_WARNING=0.5
export ALERT_THRESHOLD_MEMORY_CRITICAL=0.7

# Start the API gateway with garbage collection enabled
node --expose-gc src/api-gateway/index.js 