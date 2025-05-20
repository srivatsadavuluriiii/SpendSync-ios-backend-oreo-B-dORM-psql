# API Key Management API Documentation

## Overview
The API Key Management system provides endpoints for generating, managing, and revoking API keys. All endpoints require authentication and are rate-limited.

## Base URL
```
https://api.spendsync.com/v1
```

## Authentication
All endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Generate API Key
```http
POST /api/keys
```

Generate a new API key for the authenticated user.

**Request Body:**
```json
{
  "name": "Production API Key",
  "expiresInDays": 365,
  "permissions": ["read", "write"],
  "metadata": {
    "environment": "production",
    "service": "payment-processor"
  }
}
```

**Response:** `201 Created`
```json
{
  "message": "API key generated successfully",
  "data": {
    "key": "sk_abc123...", // Only shown once during creation
    "id": "key_123",
    "name": "Production API Key",
    "permissions": ["read", "write"],
    "status": "active",
    "createdAt": "2024-03-20T10:00:00Z",
    "expiresAt": "2025-03-20T10:00:00Z"
  }
}
```

### List API Keys
```http
GET /api/keys
```

List all API keys for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "message": "API keys retrieved successfully",
  "data": [
    {
      "id": "key_123",
      "name": "Production API Key",
      "status": "active",
      "permissions": ["read", "write"],
      "createdAt": "2024-03-20T10:00:00Z",
      "expiresAt": "2025-03-20T10:00:00Z",
      "lastUsedAt": "2024-03-20T11:00:00Z"
    }
  ]
}
```

### Rotate API Key
```http
POST /api/keys/:id/rotate
```

Rotate an existing API key. The old key remains valid during the grace period.

**Request Body:**
```json
{
  "currentKey": "sk_abc123..."
}
```

**Response:** `200 OK`
```json
{
  "message": "API key rotated successfully",
  "data": {
    "newKey": "sk_xyz789...", // New key
    "rotationExpiresAt": "2024-03-27T10:00:00Z" // Grace period end
  }
}
```

### Revoke API Key
```http
POST /api/keys/:id/revoke
```

Immediately revoke an API key.

**Request Body:**
```json
{
  "key": "sk_abc123...",
  "reason": "security precaution"
}
```

**Response:** `200 OK`
```json
{
  "message": "API key revoked successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "code": "INVALID_REQUEST",
  "details": {
    "name": "Name is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid API key",
  "code": "API_KEY_INVALID"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "code": "API_KEY_INSUFFICIENT_PERMISSIONS",
  "requiredPermissions": ["write"]
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

## Rate Limits
- Key Generation: 10 requests per hour
- Key Rotation: 5 requests per hour
- Key Listing: 60 requests per hour
- Key Validation: 1000 requests per minute

## Headers

### Request Headers
- `Authorization`: Bearer token for authentication
- `X-API-Key`: API key for protected endpoints
- `X-Request-ID`: Optional request identifier

### Response Headers
- `X-RateLimit-Limit`: Rate limit ceiling
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time until limit reset
- `X-API-Key-Rotation`: Present if key is in rotation period
- `X-API-Key-Rotation-Expires`: When rotation period ends 