# SpendSync Backend

SpendSync is a modern expense-splitting application built using a microservices architecture. This repository contains the backend implementation of the application.

## Architecture Overview

The SpendSync backend is built using a microservices architecture, with each service handling a specific aspect of the application's functionality. The services communicate with each other through RESTful APIs, allowing for independent scaling and deployment.

### Microservices

1. **API Gateway** (Port 3000)
   - Entry point for all client requests
   - Routes requests to appropriate microservices
   - Handles authentication and authorization
   - Provides a unified API for clients
   - Includes service health monitoring

2. **User Service** (Port 3001)
   - Manages user accounts and profiles
   - Handles user authentication
   - Manages groups and group memberships
   - Stores user preferences

3. **Expense Service** (Port 3002)
   - Manages expense records
   - Handles expense creation, updates, and deletion
   - Tracks expense categories
   - Manages expense participants

4. **Settlement Service** (Port 3003)
   - Calculates optimal settlement paths
   - Uses advanced algorithms (Greedy) to minimize the number of transactions
   - Tracks settlement status
   - Manages settlement history

5. **Notification Service** (Port 3004)
   - Sends notifications to users
   - Manages notification preferences
   - Tracks notification status (read/unread)
   - Handles various notification types

## Technical Stack

- **Backend**: Node.js with Express.js
- **API Documentation**: Swagger/OpenAPI
- **Data Storage**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Task Processing**: Redis-based job queue
- **Monitoring**: Custom monitoring solution
- **Inter-service Communication**: RESTful HTTP APIs
- **Development Language**: TypeScript

## TypeScript Type System

SpendSync uses a comprehensive TypeScript type system to ensure type safety across all microservices:

### Core Features

- **Centralized type definitions** in `src/types/` for global entities
- **Service-specific type declarations** for specialized domains
- **Middleware type declaration files** for better type safety in Express middleware
- **API response type standardization** using generics
- **Automated declaration file generation** tools

### Type Organization

- **Base Entity Types**: Common structures shared across services
- **Request/Response Types**: Standardized API interface types
- **External Module Declarations**: Type definitions for JavaScript modules
- **Service-Specific Types**: Types unique to each microservice

### Type Utilities

- `generate-declaration-files.js`: Scans and updates TypeScript declarations
- `check-test-types.js`: Validates type correctness in test files

For more details, see the [Type System Documentation](src/types/README.md).

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis (optional, for job queue)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/spendsync-backend.git
   cd spendsync-backend
   ```

2. Install dependencies for all services:
   ```
   npm run install-all
   ```

3. Configure environment variables:
   Create a `.env` file in each service directory based on the provided `.env.example` templates.

### Running the Services

#### Option 1: Start all services simultaneously

Use the provided shell script to start all services:
```
./start-services.sh
```

#### Option 2: Start services individually

To start each service individually, navigate to the service directory and run:
```
cd src/api-gateway
npm start
```

Repeat for each service.

### Development Mode

To run services in development mode with hot-reloading:
```
cd src/api-gateway
npm run dev
```

## API Documentation

After starting the API Gateway, you can access the Swagger UI documentation at:

```
http://localhost:3000/api-docs
```

This provides interactive documentation for all available endpoints.

## Service UIs

Each service provides a simple UI dashboard for viewing data:

- **API Gateway Dashboard**: http://localhost:3000
- **Users Dashboard**: http://localhost:3000/users-ui
- **Expenses Dashboard**: http://localhost:3000/expenses-ui
- **Settlements Dashboard**: http://localhost:3000/settlements-ui
- **Notifications Dashboard**: http://localhost:3000/notifications-ui

## Implementation Details

### API Gateway

The API Gateway serves as the entry point for all client requests. It handles:

- Authentication using JWT tokens
- Request routing to appropriate microservices
- Rate limiting to prevent abuse
- CORS configuration
- Security headers
- Error handling and standardization
- Health monitoring
- Service proxying

### User Service

The User Service manages user accounts and authentication:

- User registration and login
- Profile management
- Group creation and management
- User roles and permissions

### Expense Service

The Expense Service manages expense tracking:

- Creating and updating expenses
- Splitting expenses among participants
- Categorizing expenses
- Expense history and reporting

### Settlement Service

The Settlement Service calculates and manages settlements:

- Uses algorithms to minimize transactions
- Tracks settlement status
- Settlement history
- Multiple currency support

### Notification Service

The Notification Service handles user notifications:

- Real-time and email notifications
- Notification preferences
- Notification status tracking

## Development

### Code Structure

Each service follows a similar structure:

```
service-name/
├── config/             # Configuration files
├── controllers/        # Request handlers
├── middleware/         # Express middleware
├── models/             # Data models
├── routes/             # API routes
├── services/           # Business logic
├── utils/              # Utility functions
├── tests/              # Unit and integration tests
├── index.ts            # Entry point
└── package.json        # Dependencies
```

### Service Communication

Services communicate with each other through RESTful APIs. The API Gateway handles proxying requests to the appropriate service based on the request path.

## Testing

The SpendSync backend includes comprehensive testing:

### Unit Testing

Each service includes unit tests for individual components, testing the business logic in isolation.

```
npm run test:unit
```

### Integration Testing

Integration tests verify the interactions between components within a service.

```
npm run test:integration
```

### Contract Testing

Contract tests verify that the services can communicate with each other according to defined contracts using Pact.

```
npm run test:contract
```

For detailed information about the contract testing implementation, see:
- [Contract Testing README](tests/contracts/README.md)
- [Implementation Plan](tests/contracts/IMPLEMENTATION_PLAN.md)
- [Current Status](tests/contracts/SUMMARY.md)

### Service-specific Tests

You can also run tests for specific services:

```
npm run test:user
npm run test:expense
npm run test:settlement
npm run test:notification
npm run test:gateway
```

## CI/CD Pipeline

SpendSync uses GitHub Actions for Continuous Integration and Continuous Deployment.

### Workflows

1. **CI/CD** (.github/workflows/ci-cd.yml)
   - Triggered on push to main and develop branches
   - Runs linting and testing
   - Builds Docker images for all services
   - Deploys to development environment (develop branch only)

2. **PR Validation** (.github/workflows/pr-validation.yml)
   - Triggered on pull requests to main and develop branches
   - Validates code quality and testing
   - Ensures code coverage thresholds are met
   - Enforces semantic PR titles

3. **Release** (.github/workflows/release.yml)
   - Triggered on GitHub releases
   - Builds and tags Docker images with version numbers
   - Creates deployment artifacts for production

### Deployment

The CI/CD pipeline supports two deployment environments:

#### Development Environment
- Automatically deployed when code is pushed to the develop branch
- Uses docker-compose.dev.yml for configuration
- Environment variables stored in .env.dev

#### Production Environment
- Deployed through GitHub Releases
- Release artifacts include docker-compose configuration and environment templates
- Version-tagged Docker images

### Manual Deployment

For manual deployment, use the provided script:
```bash
# Set deployment server information
export SSH_USER=your-username
export SSH_HOST=your-server.example.com

# Run the deployment script
./scripts/deploy-dev.sh
```

## Monitoring and Maintenance

### Health Checks

Each service exposes a `/health` endpoint that returns the service's status. The API Gateway periodically checks these endpoints to ensure all services are operational.

### Logging

The application uses structured logging with different log levels (debug, info, error) to make troubleshooting easier.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 