# Redis Caching for SpendSync Settlement Service

This document explains the Redis caching implementation for the SpendSync Settlement Service.

## Overview

Redis caching has been implemented to improve the performance of frequently accessed data, reducing database load and API response times.

## Key Features

- **Service-level Caching**: Caches results of expensive operations like settlement calculations, database queries, and external API calls
- **API Response Caching**: Caches entire API responses for frequently accessed endpoints
- **Cache Invalidation**: Automatically invalidates related cache entries when data is modified
- **Metrics**: Tracks cache hit rates, operation times, and errors with Prometheus

## Cache Configuration

### Environment Variables

Configure Redis connection in your environment variables or `.env` file:

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### Cache TTLs (Time-to-live)

Default TTLs are configured in `src/services/cache.service.js`:

- Individual settlements: 1 hour
- Settlement lists: 5 minutes
- Debt graphs: 10 minutes
- Exchange rates: 1 hour
- Friendship data: 24 hours

API response caching TTLs are configured in `src/routes/settlement.routes.js`:

- Settlement suggestions: 5 minutes
- Group settlements: 2 minutes
- Settlement details: 10 minutes
- User settlements: 3 minutes
- Algorithm comparisons: 10 minutes

## Implementation Details

### Cache Keys

Cache keys follow a consistent pattern: `spendsync:<type>:<id>:<params>`

Examples:
- `spendsync:settlement:60f8a5e3b9c2a12345678901`
- `spendsync:settlementList:group123:status:pending:limit:20:offset:0`
- `spendsync:debtGraph:group123`
- `spendsync:algorithm:minCashFlow:graphHash:a1b2c3d4`

### Cached Data Types

The following types of data are cached:

1. **Settlement Records**: Individual settlement details
2. **Settlement Lists**: Lists of settlements by group, user, or other filters
3. **Debt Graphs**: Group debt data used for settlement calculations
4. **Algorithm Results**: Results of debt optimization algorithms
5. **Exchange Rates**: Currency exchange rates
6. **Friendship Data**: User relationship strengths
7. **API Responses**: Complete API responses for frequently accessed endpoints

### Cache Invalidation

Cache entries are automatically invalidated when:

- A new settlement is created (invalidates group settlement lists)
- A settlement status is updated (invalidates the settlement and related lists)
- A payment is processed (invalidates the settlement and related lists)

### Monitoring and Metrics

Cache performance is monitored with Prometheus metrics:

- `spendsync_cache_hit_total`: Count of cache hits and misses
- `spendsync_cache_set_total`: Count of cache set operations
- `spendsync_cache_invalidation_total`: Count of cache invalidations
- `spendsync_cache_error_total`: Count of cache operation errors
- `spendsync_cache_operation_seconds`: Histogram of cache operation duration

## Using the Cache Service

### Direct Cache Operations

```javascript
const cacheService = require('./services/cache.service');

// Set a value in cache
await cacheService.set('mykey', { data: 'value' }, 3600); // TTL in seconds

// Get a value from cache
const value = await cacheService.get('mykey');

// Delete a value from cache
await cacheService.del('mykey');

// Clear cache by pattern
await cacheService.clearByPattern('spendsync:settlement:*');
```

### Caching Function Results

```javascript
const cacheService = require('./services/cache.service');

// Cache the result of an expensive function
const result = await cacheService.cacheResult(
  async () => {
    // Expensive operation
    return expensiveOperation();
  },
  'cache-key',
  3600 // TTL in seconds
);
```

### API Response Caching

```javascript
const { cacheResponse } = require('../middleware/cache.middleware');

// Cache API response
router.get(
  '/endpoint',
  authenticate,
  cacheResponse(300), // TTL in seconds
  controller.handler
);

// Cache with custom key generator
router.get(
  '/endpoint/:id',
  authenticate,
  cacheResponse(300, req => `custom:${req.params.id}`),
  controller.handler
);
```

## Maintenance

### Monitoring Cache Health

Access the cache health endpoint to verify the Redis connection:

```
GET /health/redis
```

### Handling Redis Failures

The service is designed to gracefully handle Redis failures:

- If Redis is unavailable, the service falls back to non-cached operations
- All cache operations are wrapped in try-catch blocks
- Connection retries are configured with exponential backoff
- Errors are logged and tracked via Prometheus metrics

### Graceful Shutdown

The service handles SIGTERM and SIGINT signals to properly close Redis connections before shutdown.

## Best Practices

1. **Cache Invalidation**: Always invalidate cache entries when underlying data changes
2. **TTL Management**: Set appropriate TTLs based on data volatility and usage patterns
3. **Key Generation**: Use consistent key patterns to ensure cache hits
4. **Monitoring**: Regularly check cache hit rates and adjust TTLs if needed
5. **Error Handling**: Always handle cache errors gracefully to avoid service disruptions 