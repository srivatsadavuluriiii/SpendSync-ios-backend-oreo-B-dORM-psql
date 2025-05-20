# SpendSync Shared Module

This module contains shared code that is used across various services in the SpendSync application. The goal is to promote code reuse, maintain consistency, and reduce duplication.

## Contents

### Error Handling

Located in `errors/index.js`, this provides a set of standardized error classes for the entire application:

```javascript
const { NotFoundError, BadRequestError } = require('../../shared/errors');

// Usage
if (!userId) {
  throw new BadRequestError('User ID is required');
}

const user = await userService.getById(userId);
if (!user) {
  throw new NotFoundError(`User with ID ${userId} not found`);
}
```

Each error has:
- Appropriate HTTP status code
- Unique error code
- Consistent JSON serialization

### Middleware

Located in `middleware/`, these are Express middleware functions:

- **Authentication** (`auth.middleware.js`): JWT authentication and authorization
- **Error Handling** (`error.middleware.js`): Centralized error handling
- **Validation** (`validation.middleware.js`): Input validation using Joi
- **Async Handler** (`async.middleware.js`): Promise error catching

```javascript
const { 
  asyncHandler, 
  authenticate, 
  validate,
  errorHandler 
} = require('../../shared/middleware');

// Usage in route definition
router.post(
  '/users',
  validate(userValidationSchema),
  asyncHandler(userController.createUser)
);

// Error handling in app setup
app.use(errorHandler);
```

### Utilities

Located in `utils/`, these provide common utilities:

- **Pagination** (`pagination.utils.js`): Standardized pagination
- **Response** (`response.utils.js`): API response formatting

```javascript
const { 
  getPaginationParams, 
  sendSuccess, 
  sendCreated 
} = require('../../shared/utils');

// Usage in controller
const paginationParams = getPaginationParams(req.query);
const users = await userService.getUsers(paginationParams);
sendSuccess(res, users);
```

## Usage Guidelines

1. **Import directly from the module**:
   ```javascript
   const { NotFoundError } = require('../../shared/errors');
   ```

2. **Use error classes for all error handling**:
   - Use `APIError` subclasses instead of generic Error
   - Let the error middleware handle the response formatting

3. **Make routes async and use asyncHandler**:
   ```javascript
   router.get('/users/:id', asyncHandler(controller.getUser));
   ```

4. **Validate all inputs**:
   ```javascript
   router.post('/users', validate(schema), asyncHandler(controller.createUser));
   ```

5. **Use utility functions for common patterns**:
   - Pagination
   - Response formatting
   - Error handling 