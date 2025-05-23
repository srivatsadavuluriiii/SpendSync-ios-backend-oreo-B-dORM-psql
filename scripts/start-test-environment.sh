#!/bin/bash
# Start test environment with Supabase Auth
export SUPABASE_URL="your-test-supabase-url"
export SUPABASE_ANON_KEY="your-test-supabase-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-test-supabase-service-role-key"
export NODE_ENV="test"
export PORT=4000

echo "Setting up test environment..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start test services
echo "Starting test services..."
npm run test:ci 