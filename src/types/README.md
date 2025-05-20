# SpendSync Type System

This directory contains the global type definitions for the SpendSync backend. The type system is designed to provide comprehensive type safety across all services in the microservice architecture.

## Structure

- `index.d.ts` - Core entity types and shared interfaces
- `middleware.d.ts` - Type definitions for middleware functions
- Service-specific types are located in each service directory at `src/services/{service-name}/src/types/`

## Usage Guidelines

### Importing Types

Import global types from the root types directory:

```typescript
import { User, Settlement, ApiResponse } from '../../../../types';
```

Import service-specific types from the service's types directory:

```typescript
import { 
  SettlementSuggestionsResponse,
  SettlementCalculation
} from '../../src/types';
```

### Type Declarations for External Modules

When using JavaScript modules that don't have TypeScript declarations, create declaration files:

1. For shared modules:
   - Create declaration in `src/types/{module-name}.d.ts`

2. For service-specific modules:
   - Create declaration in `src/services/{service-name}/src/types/{module-name}.d.ts`

### Middleware Type Declarations

Middleware declaration files are automatically managed:

- Global middleware types are defined in `src/types/middleware.d.ts`
- Service-specific middleware declarations are in `src/services/{service-name}/src/types/shared-middleware.d.ts`

## Type Utilities

We provide utility scripts to help maintain the type system:

### Generate Declaration Files

```
node src/utils/generate-declaration-files.js
```

This script scans the codebase for exported types and generates/updates declaration files for services.

### Type Check Tests

```
node src/utils/check-test-types.js [path/to/test]
```

This script runs the TypeScript compiler in type-check mode against test files to catch type errors before runtime.

## Best Practices

1. **Define Clear Interfaces**
   - Create explicit interfaces for request/response objects
   - Extend common base interfaces (e.g., `BaseEntity`) when applicable

2. **Use Generics for Reusable Types**
   - Use `ApiResponse<T>` for all API responses
   - Use `PaginatedResponse<T>` for all paginated results

3. **Be Explicit with Types**
   - Use specific types rather than `any`
   - Define union types for values with a limited set of options

4. **Handle Nullable Properties**
   - Mark optional properties with `?`
   - Use intersection types (`&`) to extend existing types

5. **Type Tests Properly**
   - Add type assertions in test files
   - Mock return types should match the real implementation

## Core Types

### Base Types

- `BaseEntity` - Base for all entity types with common fields (id, timestamps)
- `ApiResponse<T>` - Standard response format for all API endpoints
- `PaginatedResponse<T>` - Standard format for paginated results

### Entity Types

- `User` - User account information
- `Group` - Group entity that contains members
- `Expense` - Expense record with split information
- `Settlement` - Settlement transaction between users

### Utility Types

- `PaginationParams` - Standard parameters for pagination
- `ValidationSchema` - Interface for validation schemas

## Maintaining the Type System

When adding new features:

1. Define types in the appropriate location
   - Global types in `src/types/index.d.ts`
   - Service-specific types in the service's types directory

2. Run the declaration file generator
   - This ensures all services have access to the latest types

3. Run the test type checker
   - Verify that your changes don't break existing code 