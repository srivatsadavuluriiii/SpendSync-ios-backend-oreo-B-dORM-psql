# SpendSync Technical Architecture

## Service-Oriented Architecture

### 1. User Service

#### Core Components
- **Authentication Module**
  - JWT-based authentication with refresh tokens
  - OAuth integration (Google, Apple, Facebook)
  - Password management with secure hashing (bcrypt)
  - Rate limiting for failed login attempts

- **Profile Management**
  - User information storage and retrieval
  - Profile image handling and optimization
  - Privacy settings and data export (GDPR compliance)
  - Account deletion and data anonymization

- **Social Graph**
  - Friend connection management
  - Contact import from phone/email
  - User search with privacy controls
  - Blocking and relationship management

#### API Endpoints
```
POST   /api/users/register
POST   /api/users/login
POST   /api/users/refresh-token
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/friends
POST   /api/users/friends/invite
PUT    /api/users/friends/:id/accept
```

### 2. Group Service

#### Core Components
- **Group Management**
  - Group creation and configuration
  - Member invitation and management
  - Role-based permissions (admin/member)
  - Group settings and preferences

- **Activity Tracking**
  - Event logging for group actions
  - Activity feed generation
  - Notification triggering
  - Audit trail for financial actions

#### API Endpoints
```
GET    /api/groups
POST   /api/groups
GET    /api/groups/:id
PUT    /api/groups/:id
POST   /api/groups/:id/members
DELETE /api/groups/:id/members/:userId
GET    /api/groups/:id/activity
```

### 3. Expense Service

#### Core Components
- **Transaction Processing**
  - Expense creation and validation
  - Receipt image storage and processing
  - Category management
  - Recurring expense handling

- **Splitting Engine**
  - Equal split calculation
  - Percentage-based splitting
  - Itemized splitting
  - Custom amount assignment

- **Balance Calculation**
  - Real-time balance updates
  - Debt simplification algorithms
  - Settlement suggestion generation
  - Currency conversion

#### API Endpoints
```
GET    /api/expenses
POST   /api/expenses
GET    /api/expenses/:id
PUT    /api/expenses/:id
DELETE /api/expenses/:id
GET    /api/expenses/group/:groupId
GET    /api/balances/user
GET    /api/balances/group/:groupId
```

### 4. Notification Service

#### Core Components
- **Notification Generation**
  - Event-based notification creation
  - User preference filtering
  - Notification priority assignment
  - Grouping and batching

- **Delivery Management**
  - Push notification delivery
  - Email notification formatting and sending
  - SMS dispatch for critical alerts
  - Delivery confirmation tracking

#### API Endpoints
```
GET    /api/notifications
PUT    /api/notifications/:id/read
GET    /api/notifications/preferences
PUT    /api/notifications/preferences
```

### 5. Settlement Engine

#### Core Components
- **Debt Optimization**
  - Minimum transaction path calculation
  - Graph-based debt simplification
  - Currency-aware settlement planning
  - Settlement suggestion generation

- **Settlement Tracking**
  - Manual settlement recording
  - Settlement verification
  - Payment receipt generation
  - Settlement history

#### API Endpoints
```
GET    /api/settlements/suggestions
POST   /api/settlements
GET    /api/settlements/history
```

## Data Architecture

### Database Schema

#### Users Collection
```json
{
  "id": "uuid",
  "email": "string",
  "passwordHash": "string",
  "name": "string",
  "profileImage": "string",
  "phoneNumber": "string",
  "preferences": {
    "currency": "string",
    "language": "string",
    "notifications": {
      "email": "boolean",
      "push": "boolean",
      "sms": "boolean"
    }
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Friends Collection
```json
{
  "id": "uuid",
  "userId": "uuid",
  "friendId": "uuid",
  "status": "enum(pending, accepted, blocked)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Groups Collection
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "image": "string",
  "defaultCurrency": "string",
  "createdBy": "uuid",
  "isArchived": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### GroupMembers Collection
```json
{
  "id": "uuid",
  "groupId": "uuid",
  "userId": "uuid",
  "role": "enum(admin, member)",
  "joinedAt": "timestamp"
}
```

#### Expenses Collection
```json
{
  "id": "uuid",
  "groupId": "uuid",
  "paidBy": "uuid",
  "amount": "decimal",
  "currency": "string",
  "description": "string",
  "category": "string",
  "date": "timestamp",
  "receiptImage": "string",
  "isDeleted": "boolean",
  "createdBy": "uuid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### ExpenseSplits Collection
```json
{
  "id": "uuid",
  "expenseId": "uuid",
  "userId": "uuid",
  "amount": "decimal",
  "percentage": "decimal",
  "splitType": "enum(equal, percentage, exact)",
  "createdAt": "timestamp"
}
```

#### Settlements Collection
```json
{
  "id": "uuid",
  "payerId": "uuid",
  "receiverId": "uuid", 
  "amount": "decimal",
  "currency": "string",
  "status": "enum(pending, completed)",
  "notes": "string",
  "createdAt": "timestamp",
  "completedAt": "timestamp"
}
```

#### Notifications Collection
```json
{
  "id": "uuid",
  "userId": "uuid",
  "type": "string",
  "title": "string", 
  "message": "string",
  "relatedEntityId": "uuid",
  "relatedEntityType": "string",
  "isRead": "boolean",
  "createdAt": "timestamp"
}
```

### Data Flow Architecture

#### Expense Creation Flow
1. User creates expense through API
2. Expense Service validates and stores expense details
3. Expense Service calculates individual splits
4. Balances are updated in real-time
5. Notification Service alerts relevant group members
6. Activity is logged in Group Service

#### Settlement Flow
1. User requests settlement suggestions
2. Settlement Engine calculates optimal settlement path
3. User records a settlement transaction
4. Expense Service updates balances
5. Notification Service alerts the recipient
6. Settlement is recorded in transaction history

## API Layer

### RESTful API Design
- Consistent resource-based URL structure
- Proper HTTP method usage (GET, POST, PUT, DELETE)
- Standard response formats with appropriate status codes
- Pagination for list endpoints
- Filtering and sorting capabilities

### Authentication & Authorization
- JWT token validation middleware
- Role-based access control
- Resource ownership verification
- Rate limiting and abuse prevention

### WebSocket Implementation
- Real-time balance updates
- Activity feed notifications
- Typing indicators for comments
- Online presence indicators

## Security Implementation

### Data Protection
- All sensitive data encrypted at rest
- TLS for all API communications
- PII handling compliant with GDPR/CCPA
- Database encryption for sensitive fields

### Authentication Security
- Password hashing with bcrypt (cost factor 12)
- JWT with short expiration + refresh token pattern
- OAuth2 for social login
- 2FA option for sensitive operations

### API Security
- CORS configuration with appropriate origins
- CSRF protection for browser clients
- Input validation and sanitization
- Rate limiting based on user/IP

## Event-Driven Architecture

### Event Publishing
- Expense created/updated/deleted events
- Group membership changes
- Settlement completed events
- User profile updates

### Event Consumers
- Balance calculation service
- Notification dispatcher
- Activity feed generator
- Analytics collector

## Scaling Strategy

### Horizontal Scaling
- Stateless service design for easy replication
- Load balancing across service instances
- Database read replicas for query scaling
- Caching layer with Redis

### Database Scaling
- Initial single PostgreSQL database
- Future sharding strategy based on user groups
- Read replicas for reporting and analytics
- Time-series partitioning for historical data

### Caching Strategy
- Redis for real-time balances and frequently accessed data
- User and group data caching
- API response caching where appropriate
- Cache invalidation on write operations

## Monitoring & Observability

### Application Metrics
- Request rates and latencies
- Error rates by endpoint
- Database query performance
- Cache hit/miss ratios

### Business Metrics
- User acquisition and retention
- Expense entry frequency
- Settlement completion rates
- Feature usage analytics

### Logging Strategy
- Structured JSON logs
- Correlation IDs across services
- Log level management
- Sensitive data masking

## Deployment Architecture

### Container Orchestration
- Docker containerization for all services
- Kubernetes for orchestration
- Helm charts for deployment management
- Rolling update strategy

### CI/CD Pipeline
- Automated testing on pull requests
- Continuous integration with GitHub Actions
- Staging environment deployment
- Blue/green production deployments

### Infrastructure as Code
- Terraform for cloud resource provisioning
- AWS as primary cloud provider
- Multi-environment configuration
- Secret management with AWS Secrets Manager 