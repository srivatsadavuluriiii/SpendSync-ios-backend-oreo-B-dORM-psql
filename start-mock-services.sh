#!/bin/bash

# Kill any existing node processes on these ports
echo "Stopping any existing services..."
kill $(lsof -t -i:3001) 2>/dev/null || true
kill $(lsof -t -i:3002) 2>/dev/null || true
kill $(lsof -t -i:3004) 2>/dev/null || true
kill $(lsof -t -i:4000) 2>/dev/null || true

# Install axios if not already installed
if ! npm list axios >/dev/null 2>&1; then
  echo "Installing axios..."
  npm install axios --no-save
fi

# Start services in background
echo "Starting mock services..."
node mock-user-service.js > logs/user-service.log 2>&1 &
echo "Mock User Service started on port 3001"

node mock-expense-service.js > logs/expense-service.log 2>&1 &
echo "Mock Expense Service started on port 3002"

node mock-notification-service.js > logs/notification-service.log 2>&1 &
echo "Mock Notification Service started on port 3004"

# Give services a moment to start
sleep 2

# Start API Gateway
echo "Starting API Gateway..."
JWT_SECRET=development-secret-key NODE_ENV=development PORT=4000 USER_SERVICE_URL=http://localhost:3001 EXPENSE_SERVICE_URL=http://localhost:3002 SETTLEMENT_SERVICE_URL=http://localhost:3003 NOTIFICATION_SERVICE_URL=http://localhost:3004 ANALYTICS_SERVICE_URL=http://localhost:3005 PAYMENT_SERVICE_URL=http://localhost:3006 ALERT_THRESHOLD_MEMORY_WARNING=0.5 ALERT_THRESHOLD_MEMORY_CRITICAL=0.7 node --expose-gc src/api-gateway/index.js > logs/api-gateway.log 2>&1 &
echo "API Gateway started on port 4000"

echo ""
echo "Mock SpendSync system is running!"
echo ""
echo "API Gateway: http://localhost:4000"
echo "User Service: http://localhost:3001"
echo "Expense Service: http://localhost:3002"
echo "Notification Service: http://localhost:3004"
echo ""
echo "Test the full system with the following curl commands:"
echo ""
echo "1. Check services status:"
echo "   curl http://localhost:4000/services/status"
echo ""
echo "2. Create a test user session:"
echo "   curl -X POST -H \"Content-Type: application/json\" -d '{\"email\":\"test@example.com\",\"password\":\"password\"}' http://localhost:3001/api/v1/auth/login"
echo ""
echo "3. Create an expense:"
echo "   curl -X POST -H \"Content-Type: application/json\" -d '{\"description\":\"Dinner\",\"amount\":100,\"paidBy\":\"1234\",\"groupId\":\"g1\",\"participants\":[{\"userId\":\"5678\"},{\"userId\":\"9012\"}]}' http://localhost:3002/api/v1/expenses"
echo ""
echo "4. Check notifications:"
echo "   curl http://localhost:3004/api/v1/notifications?userId=1234"
echo "   curl http://localhost:3004/api/v1/notifications?userId=5678"
echo ""
echo "5. Check balances:"
echo "   curl http://localhost:3002/api/v1/expenses/balances?groupId=g1"
echo ""
echo "To stop all services, run: pkill -f 'node mock|node --expose-gc'" 