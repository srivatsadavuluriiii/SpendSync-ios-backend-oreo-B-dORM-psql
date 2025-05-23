#!/bin/bash

# Start API Gateway with development environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-supabase-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
export NODE_ENV="development"
export PORT=4000

echo "Starting API Gateway with development configuration..."
node src/api-gateway/index.js 