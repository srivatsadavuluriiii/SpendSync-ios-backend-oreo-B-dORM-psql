#!/bin/bash
# Start API Gateway with development environment variables
export SUPABASE_URL=your-supabase-url
export SUPABASE_ANON_KEY=your-supabase-anon-key
export SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
export NODE_ENV=development
export PORT=4000
export USER_SERVICE_URL=http://localhost:3001
export EXPENSE_SERVICE_URL=http://localhost:3002
export SETTLEMENT_SERVICE_URL=http://localhost:3003
export NOTIFICATION_SERVICE_URL=http://localhost:3004
export ANALYTICS_SERVICE_URL=http://localhost:3005
export PAYMENT_SERVICE_URL=http://localhost:3006

echo "Starting API Gateway..."
node src/api-gateway/index.js 