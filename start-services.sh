#!/bin/bash

# Start-services script for SpendSync backend
# This script starts all the microservices required for the application

# Kill any existing processes on these ports
echo "Killing any existing processes on service ports..."
for port in 3000 3001 3002 3003 3004; do
  pid=$(lsof -t -i:$port)
  if [ ! -z "$pid" ]; then
    echo "Killing process $pid on port $port"
    kill -9 $pid
  fi
done

# Start services in separate terminals
echo "Starting API Gateway on port 3000..."
cd src/api-gateway && node index.js &

echo "Starting User Service on port 3001..."
cd src/services/user-service && node src/index.js &

echo "Starting Expense Service on port 3002..."
cd src/services/expense-service && node src/index.js &

echo "Starting Settlement Service on port 3003..."
cd src/services/settlement-service && node src/index.js &

echo "Starting Notification Service on port 3004..."
cd src/services/notification-service && node src/index.js &

echo "All services started!"
echo "API Gateway: http://localhost:3000"
echo "User Service: http://localhost:3001"
echo "Expense Service: http://localhost:3002"
echo "Settlement Service: http://localhost:3003"
echo "Notification Service: http://localhost:3004"

# Keep script running
wait 