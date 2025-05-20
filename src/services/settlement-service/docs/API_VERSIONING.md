# API Versioning Guide

## Overview

This document outlines the API versioning strategy implemented in the SpendSync settlement service. The versioning approach ensures backward compatibility while allowing the API to evolve over time.

## Versioning Approach

The API uses a combined approach that supports multiple methods for specifying the API version:

1. **URL Path Versioning**: Primary method where version is specified in the URL path
2. **Custom Headers**: Versioning through custom HTTP headers
3. **Accept Header Versioning**: Versioning through the Accept header content type

## Supported Versions

- `v1`: Initial API version (current)

When no version is specified, the API defaults to the latest stable version (currently `v1`).

## Version Specification Methods

### 1. URL Path Versioning

Include the version in the URL path:

```
GET /api/v1/settlements
```

This is the most explicit and preferred method.

### 2. Custom Header Versioning

Specify the version using the `X-API-Version` header:

```
GET /api/settlements
X-API-Version: v1
```

### 3. Accept Header Versioning

Specify the version in the Accept header with a vendor-specific media type:

```
GET /api/settlements
Accept: application/vnd.spendsync.v1+json
```

## Backward Compatibility

For backward compatibility, routes without a version prefix (`/api/settlements`) default to the latest stable version (`v1`).

## Adding New API Versions

When introducing breaking changes, follow these steps to add a new API version:

1. Create a new versioned controller file:
   ```
   settlement.controller.v2.js
   ```

2. Implement only the methods that change in the new version:
   ```javascript
   const v1Controller = require('./settlement.controller');

   async function newMethod(req, res, next) {
     // New implementation
   }

   module.exports = {
     newMethod,
     // Only export methods that change
   };
   ```

3. Update the `versioning.middleware.js` to include the new version:
   ```javascript
   const SUPPORTED_VERSIONS = ['v1', 'v2'];
   ```

4. Use the `versionRoute` middleware in your route definition to automatically route to the correct version:
   ```javascript
   const handlers = createVersionedMethodHandlers('settlement', 'methodName');
   router.get('/path', versionRoute(handlers));
   ```

## Versioning Guidelines

1. **Maintain Backward Compatibility**: Never make breaking changes to an existing API version.
2. **Add New Versions Sparingly**: Only introduce a new version when absolutely necessary.
3. **Document Changes**: Clearly document differences between API versions.
4. **Deprecation Policy**: When deprecating an API version, provide ample notice to clients (at least 6 months).
5. **Sunset Old Versions**: Eventually remove old versions after sufficient notice and migration time.

## Testing Versioned APIs

When testing API endpoints, specify the version explicitly:

```bash
# Using URL path versioning
curl -X GET http://localhost:3003/api/v1/settlements

# Using custom header
curl -X GET http://localhost:3003/api/settlements -H "X-API-Version: v1"

# Using Accept header
curl -X GET http://localhost:3003/api/settlements -H "Accept: application/vnd.spendsync.v1+json"
```

## Error Handling

If an unsupported version is requested, the API returns a 400 Bad Request error with details about supported versions.

## Best Practices for API Consumers

1. Always specify the API version explicitly in requests.
2. Prepare to migrate to newer API versions when notified about deprecations.
3. Test applications against newer API versions before migrating.
4. Follow the API changelog for updates and deprecation notices. 