#!/bin/bash

# Create necessary directories
mkdir -p logs
mkdir -p src/api-gateway/health
mkdir -p src/services/user-service/health
mkdir -p src/services/expense-service/health
mkdir -p src/services/settlement-service/health
mkdir -p src/services/notification-service/health
mkdir -p src/services/analytics-service/health
mkdir -p src/services/payment-service/health

# Set proper permissions
chmod -R 755 logs
chmod -R 755 src

# Create log files with proper permissions
touch logs/error.log
touch logs/combined.log
chmod 644 logs/error.log
chmod 644 logs/combined.log

# Create empty swagger.json if doesn't exist
if [ ! -f "src/api-gateway/swagger.json" ]; then
  echo "{}" > src/api-gateway/swagger.json
fi

echo "Render deployment environment setup completed!" 