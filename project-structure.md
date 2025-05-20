# SpendSync Project Structure

## Root Directory
```
/
├── README.md                # Project overview
├── development-plan.md      # Comprehensive development plan
├── technical-architecture.md # Technical architecture details
├── src/                     # Source code
├── docs/                    # Documentation
├── infrastructure/          # Infrastructure as code
└── tests/                   # Test suite
```

## Source Code
```
/src
├── services/                # Microservices
│   ├── user-service/        # User management service
│   ├── group-service/       # Group management service
│   ├── expense-service/     # Expense handling service
│   ├── settlement-service/  # Settlement engine
│   └── notification-service/ # Notification service
├── api-gateway/             # API Gateway implementation
├── shared/                  # Shared libraries and utilities
├── database/                # Database schemas and migrations
└── client/                  # Client applications
    ├── web/                 # Web client
    ├── ios/                 # iOS client
    └── android/             # Android client
```

## Services Structure (Example: Expense Service)
```
/src/services/expense-service
├── src/
│   ├── controllers/         # API controllers
│   ├── models/              # Data models
│   ├── services/            # Business logic
│   │   ├── expense.service.js       # Expense CRUD operations
│   │   ├── split.service.js         # Splitting algorithms
│   │   └── balance.service.js       # Balance calculations
│   ├── repositories/        # Data access layer
│   ├── validators/          # Input validation
│   ├── middleware/          # Express middleware
│   ├── utils/               # Utility functions
│   └── index.js             # Service entry point
├── tests/                   # Service-specific tests
├── Dockerfile               # Docker configuration
├── package.json             # Dependencies
└── README.md                # Service documentation
```

## Settlement Service (Detailed)
```
/src/services/settlement-service
├── src/
│   ├── controllers/
│   │   └── settlement.controller.js   # Settlement API endpoints
│   ├── models/
│   │   └── settlement.model.js        # Settlement data model
│   ├── services/
│   │   ├── settlement.service.js      # Settlement operations
│   │   ├── optimization.service.js    # Debt optimization algorithms
│   │   ├── currency.service.js        # Currency conversion
│   │   └── visualization.service.js   # Debt visualization
│   ├── algorithms/
│   │   ├── greedy.algorithm.js        # Greedy settlement algorithm
│   │   ├── min-cash-flow.algorithm.js # Minimum cash flow algorithm
│   │   └── circular-debt.algorithm.js # Circular debt simplification
│   ├── repositories/
│   │   └── settlement.repository.js   # Settlement data access
│   └── utils/
│       └── graph.utils.js             # Graph manipulation utilities
├── tests/
│   ├── unit/                          # Unit tests
│   │   ├── greedy.algorithm.test.js
│   │   └── min-cash-flow.algorithm.test.js
│   └── integration/                   # Integration tests
│       └── settlement.service.test.js
└── package.json
```

## Documentation
```
/docs
├── api/                     # API documentation
│   ├── user-service.yaml    # User service OpenAPI spec
│   ├── group-service.yaml   # Group service OpenAPI spec
│   ├── expense-service.yaml # Expense service OpenAPI spec
│   └── settlement-service.yaml # Settlement service OpenAPI spec
├── architecture/            # Architecture diagrams
│   ├── system-overview.png  # High-level system diagram
│   ├── data-flow.png        # Data flow diagrams
│   └── service-interactions.png # Service interaction diagrams
├── algorithms/              # Algorithm documentation
│   └── debt-optimization.md # Debt optimization details
├── setup/                   # Setup guides
│   ├── development.md       # Development environment setup
│   └── deployment.md        # Deployment instructions
└── user/                    # User documentation
    ├── api-usage.md         # API usage examples
    └── integration.md       # Integration guidelines
```

## Infrastructure
```
/infrastructure
├── terraform/               # Terraform configurations
│   ├── modules/             # Reusable Terraform modules
│   ├── environments/        # Environment-specific configurations
│   │   ├── dev/             # Development environment
│   │   ├── staging/         # Staging environment
│   │   └── production/      # Production environment
│   └── main.tf              # Main Terraform configuration
├── kubernetes/              # Kubernetes manifests
│   ├── base/                # Base Kubernetes configurations
│   │   ├── services/        # Service definitions
│   │   ├── deployments/     # Deployment configurations
│   │   └── ingress/         # Ingress rules
│   └── overlays/            # Environment-specific overlays
│       ├── dev/             # Development overlays
│       ├── staging/         # Staging overlays
│       └── production/      # Production overlays
├── docker/                  # Docker configurations
│   ├── docker-compose.yml   # Local development setup
│   └── Dockerfile.base      # Base Dockerfile
└── ci-cd/                   # CI/CD configurations
    └── github-actions/      # GitHub Actions workflows
        ├── build.yml        # Build workflow
        ├── test.yml         # Test workflow
        └── deploy.yml       # Deployment workflow
```

## Testing
```
/tests
├── unit/                    # Unit tests
│   ├── user-service/        # User service unit tests
│   ├── group-service/       # Group service unit tests
│   ├── expense-service/     # Expense service unit tests
│   └── settlement-service/  # Settlement service unit tests
├── integration/             # Integration tests
│   ├── api/                 # API integration tests
│   └── services/            # Service integration tests
├── e2e/                     # End-to-end tests
│   ├── web/                 # Web client E2E tests
│   ├── ios/                 # iOS client E2E tests
│   └── android/             # Android client E2E tests
├── performance/             # Performance tests
│   ├── load-tests/          # Load testing scripts
│   └── benchmarks/          # Benchmarking scripts
└── fixtures/                # Test fixtures
    └── data/                # Test data
```

## Key Files

### Database Schema Definitions
```
/src/database/schemas/
├── users.schema.js          # Users table schema
├── groups.schema.js         # Groups table schema
├── expenses.schema.js       # Expenses table schema
├── expense-splits.schema.js # Expense splits table schema
├── settlements.schema.js    # Settlements table schema
└── notifications.schema.js  # Notifications table schema
```

### API Gateway Configuration
```
/src/api-gateway/
├── routes/
│   ├── user.routes.js       # User service routes
│   ├── group.routes.js      # Group service routes
│   ├── expense.routes.js    # Expense service routes
│   └── settlement.routes.js # Settlement service routes
├── middleware/
│   ├── authentication.js    # Authentication middleware
│   ├── rate-limiting.js     # Rate limiting middleware
│   └── request-validation.js # Request validation middleware
└── swagger.json            # API documentation
```

### Core Settlement Algorithm
```
/src/services/settlement-service/src/algorithms/min-cash-flow.algorithm.js
```

### Deployment Configuration
```
/infrastructure/kubernetes/base/deployments/
├── user-service.yaml        # User service deployment
├── group-service.yaml       # Group service deployment
├── expense-service.yaml     # Expense service deployment
├── settlement-service.yaml  # Settlement service deployment
└── notification-service.yaml # Notification service deployment
```

This structure provides a clear organization for the SpendSync backend, emphasizing a microservice architecture that allows for independent development, deployment, and scaling of each service. The settlement service, with its sophisticated debt optimization algorithms, is isolated as a separate service with its own dedicated resources for maximum performance and flexibility. 