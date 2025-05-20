# API Versioning Implementation for SpendSync

## Introduction

This document explains the implementation of API versioning in the SpendSync settlement service. The versioning system allows the API to evolve while maintaining backward compatibility with existing clients.

## How API Versioning Works

The implementation supports three methods of specifying the API version:

1. **URL Path Versioning** - `/api/v1/settlements`
2. **Accept Header Versioning** - `Accept: application/vnd.spendsync.v1+json`
3. **Custom Header Versioning** - `X-API-Version: v1`

All versions have feature parity initially (v1). When changes are needed, new versioned controllers are created to handle only the endpoints that change.

## Key Components

### 1. Versioning Middleware

Located at `src/middleware/versioning.middleware.js`, this middleware:
- Extracts API version from various sources (URL, headers)
- Validates the requested version against supported versions
- Sets version information in the request and response objects

Key functions:
- `extractVersion` - Extracts and validates the API version
- `versionRoute` - Routes requests to the appropriate version handler

### 2. Version Utilities

Located at `src/utils/version.utils.js`, these utilities make it easier to work with versioned controllers:
- `createVersionedControllerMapping` - Creates a mapping of versions to controllers
- `createVersionedMethodHandlers` - Creates handlers for specific controller methods across versions

### 3. API Routes

Located at `src/routes/api.routes.js`, this file:
- Organizes all API routes
- Applies versioning middleware
- Maps both versioned and non-versioned routes to the appropriate handlers

### 4. Sample Version Controller

Located at `src/controllers/settlement.controller.v2.js`, this file demonstrates:
- How to create a versioned controller
- How to extend or replace functionality from previous versions

## Adding a New API Version

### Step 1: Create a New Controller Version

Create a new controller file with the version suffix, e.g., `settlement.controller.v2.js`:

```javascript
/**
 * Settlement Controller v2
 */
const v1Controller = require('./settlement.controller');

async function getSettlementSuggestions(req, res, next) {
  // New implementation for v2
}

module.exports = {
  getSettlementSuggestions,
  // Only export methods that change
};
```

### Step 2: Update Supported Versions

In `versioning.middleware.js`, add the new version to the `SUPPORTED_VERSIONS` array:

```javascript
const SUPPORTED_VERSIONS = ['v1', 'v2'];
```

### Step 3: Use Versioned Routes in the Router

Use the versioning utilities in your route definition:

```javascript
const handlers = createVersionedMethodHandlers('settlement', 'getSettlementSuggestions');
router.get('/suggestions/:groupId', versionRoute(handlers));
```

### Step 4: Document the Changes

Update the API documentation to reflect the changes between versions.

## Testing Versioned APIs

A test script is provided at `scripts/test-versioning.js` to verify the versioning behavior. Run it with:

```
npm run test:versioning
```

## Guidelines for Version Management

1. **Version Sparingly**: Only create a new version when you need to make breaking changes.
2. **Maintain Backward Compatibility**: Never change the behavior of an existing API version.
3. **Document Changes**: Clearly document differences between API versions.
4. **Deprecate Responsibly**: Give clients ample warning before deprecating an API version.

## Additional Documentation

For more detailed information, see:
- [API Versioning Guide](docs/API_VERSIONING.md) - Detailed guidelines for API versioning
- API Documentation - Available at `/api-docs` when the service is running 