#!/bin/bash

# SpendSync Supabase MongoDB Sync Deployment Script
# This script deploys the edge function and sets up the database for MongoDB synchronization

set -e

echo "🚀 Starting SpendSync Supabase MongoDB Sync Deployment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ supabase/config.toml not found. Please run this script from the project root."
    exit 1
fi

# Initialize Supabase project if not already done
if [ ! -d ".supabase" ]; then
    echo "📦 Initializing Supabase project..."
    supabase init
fi

# Start local Supabase (for development)
echo "🔧 Starting local Supabase development environment..."
supabase start

# Apply database migrations
echo "📊 Applying database migrations..."
supabase db reset

# Deploy edge function
echo "⚡ Deploying MongoDB sync edge function..."
supabase functions deploy sync-to-mongodb --no-verify-jwt

# Set up environment variables for the edge function
echo "🔐 Setting up environment variables..."

# Prompt for MongoDB URI if not set
if [ -z "$MONGODB_URI" ]; then
    echo "Please enter your MongoDB connection URI:"
    read -r MONGODB_URI
fi

# Set environment variables for the edge function
supabase secrets set MONGODB_URI="$MONGODB_URI"

# Get the local Supabase URL and keys
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
SUPABASE_ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
SUPABASE_SERVICE_ROLE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')

echo "📋 Local Supabase Configuration:"
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_ANON_KEY: $SUPABASE_ANON_KEY"
echo "SUPABASE_SERVICE_ROLE_KEY: $SUPABASE_SERVICE_ROLE_KEY"

# Update the webhook URL in database settings
WEBHOOK_URL="${SUPABASE_URL}/functions/v1/sync-to-mongodb"
echo "🔗 Setting webhook URL: $WEBHOOK_URL"

# Set the webhook URL in the database
supabase db psql -c "ALTER DATABASE postgres SET app.settings.mongodb_sync_webhook_url = '$WEBHOOK_URL';"
supabase db psql -c "ALTER DATABASE postgres SET app.settings.supabase_service_role_key = '$SUPABASE_SERVICE_ROLE_KEY';"

# Test the edge function
echo "🧪 Testing edge function..."
curl -X POST "$WEBHOOK_URL/health" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next Steps:"
echo "1. Update your application's environment variables:"
echo "   SUPABASE_URL=$SUPABASE_URL"
echo "   SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "   SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "2. Test the sync by creating some data in Supabase"
echo "3. Check your MongoDB to verify data synchronization"
echo ""
echo "🔧 Useful commands:"
echo "   - View edge function logs: supabase functions logs sync-to-mongodb"
echo "   - Check sync queue: supabase db psql -c 'SELECT * FROM public.sync_queue;'"
echo "   - Trigger bulk sync: supabase db psql -c 'SELECT public.trigger_bulk_sync();'"
echo "   - Process sync queue: supabase db psql -c 'SELECT public.process_sync_queue();'" 