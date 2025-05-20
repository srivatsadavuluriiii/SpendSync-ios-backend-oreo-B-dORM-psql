# SpendSync Database Module

This module provides a standardized way to interact with the MongoDB database across all SpendSync services.

## Architecture

The database module follows a clean architecture with clear separation of concerns:

```
database/
├── models/           # Data models & validation
├── repositories/     # Data access logic
├── connection.js     # Database connection management
├── config.js         # Environment-specific configuration
└── index.js          # Main entry point
```

## Models

Models represent domain entities and provide data structure and validation. They extend `BaseModel` which provides common functionality.

Example usage:

```javascript
const UserModel = require('./models/user.model');

// Create a new user object
const user = UserModel.create({
  email: 'user@example.com',
  name: 'John Doe'
});

// Format for JSON response (removes sensitive fields)
const safeUser = UserModel.toJSON(user);
```

## Repositories

Repositories provide data access methods for specific collections. They extend `BaseRepository` which provides common CRUD operations.

Example usage:

```javascript
const userRepository = require('./repositories/user.repository');

// Find a user by ID
const user = await userRepository.findById('123');

// Create a new user
const newUser = await userRepository.create({
  email: 'user@example.com',
  name: 'John Doe'
});

// Update a user
const updated = await userRepository.update('123', { name: 'Jane Doe' });

// Delete a user
await userRepository.delete('123');
```

## Connection Management

The database connection is managed by a singleton connection manager:

```javascript
const { initializeDatabase, closeDatabase } = require('../../shared/database');

// In your service startup
await initializeDatabase();

// When shutting down
await closeDatabase();
```

## Configuration

Configuration is environment-specific and can be set via environment variables:

- `NODE_ENV`: Environment mode (`development`, `test`, or `production`)
- `MONGODB_URI`: MongoDB connection URI
- `MONGODB_DBNAME`: Database name

## Best Practices

1. **Use Models for Data Validation**: Always use models to create and validate data structures
2. **Use Repositories for Data Access**: Don't access the database directly; use repositories
3. **Error Handling**: All database errors are standardized as `DatabaseError` instances
4. **Transactions**: Use `dbConnection.withTransaction()` for operations that need atomicity
5. **Indexes**: Define indexes for frequent queries to optimize performance

## Creating New Models and Repositories

1. Create a model that extends `BaseModel`
2. Create a repository that extends `BaseRepository`
3. Use the model in the repository for data creation and validation

See the existing implementations for examples. 