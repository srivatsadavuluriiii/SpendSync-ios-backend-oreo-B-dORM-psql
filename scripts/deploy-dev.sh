#!/bin/bash
# Manual deployment script for SpendSync development environment

# Check if .env.dev exists
if [ ! -f ".env.dev" ]; then
  echo "Error: .env.dev file not found!"
  echo "Please create a .env.dev file based on .github/env.dev.example"
  exit 1
fi

# Check if SSH_HOST is set
if [ -z "$SSH_HOST" ]; then
  echo "Error: SSH_HOST environment variable not set!"
  echo "Please set the SSH_HOST environment variable to the hostname of your development server."
  echo "Example: export SSH_HOST=your-dev-server.example.com"
  exit 1
fi

# Check if SSH_USER is set
if [ -z "$SSH_USER" ]; then
  echo "Error: SSH_USER environment variable not set!"
  echo "Please set the SSH_USER environment variable to the SSH username for your development server."
  echo "Example: export SSH_USER=deploy"
  exit 1
fi

# Build and push Docker images
echo "Building and pushing Docker images..."

# Set TAG from .env.dev or default to develop
TAG=$(grep TAG .env.dev | cut -d '=' -f2 || echo "develop")

docker-compose -f docker-compose.yml build
docker tag spendsync-api-gateway:latest spendsync/api-gateway:$TAG
docker tag spendsync-user-service:latest spendsync/user-service:$TAG
docker tag spendsync-expense-service:latest spendsync/expense-service:$TAG
docker tag spendsync-settlement-service:latest spendsync/settlement-service:$TAG
docker tag spendsync-notification-service:latest spendsync/notification-service:$TAG

docker push spendsync/api-gateway:$TAG
docker push spendsync/user-service:$TAG
docker push spendsync/expense-service:$TAG
docker push spendsync/settlement-service:$TAG
docker push spendsync/notification-service:$TAG

# Create deployment directory on the server
echo "Creating deployment directory on $SSH_HOST..."
ssh $SSH_USER@$SSH_HOST "mkdir -p ~/spendsync-dev"

# Copy docker-compose and .env files
echo "Copying deployment files to $SSH_HOST..."
scp docker-compose.dev.yml $SSH_USER@$SSH_HOST:~/spendsync-dev/docker-compose.yml
scp .env.dev $SSH_USER@$SSH_HOST:~/spendsync-dev/.env

# Deploy to the server
echo "Deploying to $SSH_HOST..."
ssh $SSH_USER@$SSH_HOST "cd ~/spendsync-dev && docker-compose pull && docker-compose up -d"

echo "Deployment completed successfully!"
echo "The SpendSync application has been deployed to $SSH_HOST"
echo "API Gateway is accessible at http://$SSH_HOST:3000" 