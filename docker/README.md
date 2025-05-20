# SpendSync Docker Setup

This directory contains the Docker setup for the SpendSync application for local development.

## Services

The Docker environment consists of the following services:

- **API Gateway** - Entry point for all API requests
- **User Service** - Handles user accounts and authentication
- **Expense Service** - Manages expense records and splits
- **Settlement Service** - Handles debt optimization and settlements
- **Notification Service** - Manages user notifications
- **MongoDB** - Database for all services
- **MailHog** - SMTP testing service for email notifications

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your machine

### Starting the Environment

1. From the root of the project, run:

```bash
docker-compose up -d
```

This will build and start all the services in detached mode.

2. The services will be available at:

- API Gateway: http://localhost:3000
- User Service: http://localhost:3001
- Expense Service: http://localhost:3002
- Settlement Service: http://localhost:3003
- Notification Service: http://localhost:3004
- MongoDB: mongodb://localhost:27017
- MailHog UI: http://localhost:8025

### Stopping the Environment

To stop all services:

```bash
docker-compose down
```

To stop and remove all containers, networks, and volumes:

```bash
docker-compose down -v
```

## Development Workflow

The Docker setup is configured for local development with the following features:

- Source code directories are mounted as volumes, so changes are reflected immediately
- Node modules are persisted in Docker volumes for better performance
- Services are configured to connect to each other using internal Docker network names

## Troubleshooting

- **Connection issues between services**: Make sure all services are running (`docker-compose ps`)
- **Database connection issues**: Check MongoDB logs (`docker-compose logs mongodb`)
- **Restarting a single service**: `docker-compose restart service-name` 