# Supabase to MongoDB Synchronization System

This document describes the real-time data synchronization system between Supabase PostgreSQL and MongoDB for the SpendSync application.

## Overview

The synchronization system ensures that all data changes in Supabase PostgreSQL are automatically replicated to your MongoDB database in real-time. This allows you to:

- Use Supabase Auth for authentication (PostgreSQL-based)
- Keep your existing MongoDB-based microservices architecture
- Maintain data consistency across both databases
- Leverage the best features of both database systems

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Supabase      │    │  Edge Function   │    │    MongoDB      │
│   PostgreSQL    │───▶│  (Deno/TypeScript│───▶│   Collections   │
│                 │    │   sync-to-mongodb│    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │                        │                       │
    ┌────▼────┐              ┌────▼────┐             ┌────▼────┐
    │Database │              │ Webhook │             │  Your   │
    │Triggers │              │ Handler │             │Services │
    └─────────┘              └─────────┘             └─────────┘
```

## Components

### 1. Database Schema (PostgreSQL)

The system creates the following tables in Supabase:

- **`auth.users`** - Supabase built-in user authentication
- **`user_profiles`** - Extended user profile information
- **`groups`** - Expense sharing groups
- **`expenses`** - Individual expenses
- **`settlements`** - Payment settlements between users
- **`notifications`** - User notifications
- **`sync_queue`** - Failed sync attempts for retry mechanism

### 2. Edge Function (`sync-to-mongodb`)

A Deno-based edge function that:
- Receives database change webhooks
- Transforms PostgreSQL data to MongoDB format
- Handles INSERT, UPDATE, and DELETE operations
- Provides bulk synchronization capabilities
- Includes error handling and retry mechanisms

### 3. Database Triggers

PostgreSQL triggers that automatically call the edge function when data changes occur in any monitored table.

## Setup Instructions

### Prerequisites

1. **Supabase CLI** installed globally:
   ```bash
   npm install -g supabase
   ```

2. **MongoDB** instance running and accessible

3. **Environment Variables**:
   ```bash
   MONGODB_URI=mongodb://your-mongodb-connection-string
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Deployment

1. **Run the deployment script**:
   ```bash
   cd /path/to/your/project
   ./supabase/deploy.sh
   ```

2. **For production deployment**:
   ```bash
   # Link to your Supabase project
   supabase link --project-ref your-project-ref
   
   # Deploy to production
   supabase functions deploy sync-to-mongodb
   supabase db push
   
   # Set production secrets
   supabase secrets set MONGODB_URI="your-production-mongodb-uri"
   ```

## Configuration

### Table Mapping

The sync system maps PostgreSQL tables to MongoDB collections:

| PostgreSQL Table | MongoDB Collection | Description |
|------------------|-------------------|-------------|
| `auth.users` | `users` | User authentication data |
| `user_profiles` | `user_profiles` | Extended user profiles |
| `groups` | `groups` | Expense sharing groups |
| `expenses` | `expenses` | Individual expenses |
| `settlements` | `settlements` | Payment settlements |
| `notifications` | `notifications` | User notifications |

### Data Transformation

Each table has a custom transformation function that:
- Maps PostgreSQL UUIDs to MongoDB `_id` fields
- Converts PostgreSQL JSONB to MongoDB objects
- Handles data type differences between databases
- Filters sensitive authentication data

### Environment Variables

Set these in your Supabase project:

```bash
# Required
MONGODB_URI=mongodb://username:password@host:port/database

# Optional (auto-configured in development)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## API Endpoints

The edge function provides several endpoints:

### 1. Webhook Handler
- **URL**: `/sync-to-mongodb`
- **Method**: POST
- **Purpose**: Receives database change notifications
- **Payload**:
  ```json
  {
    "type": "db_change",
    "table": "public.expenses",
    "eventType": "INSERT",
    "new": { /* record data */ },
    "old": null,
    "timestamp": 1640995200
  }
  ```

### 2. Bulk Sync
- **URL**: `/sync-to-mongodb/bulk`
- **Method**: POST
- **Purpose**: Synchronizes all existing data
- **Response**:
  ```json
  {
    "success": true,
    "results": [
      {
        "table": "user_profiles",
        "status": "success",
        "count": 150
      }
    ]
  }
  ```

### 3. Health Check
- **URL**: `/sync-to-mongodb/health`
- **Method**: GET
- **Purpose**: Verify function is running
- **Response**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

## Monitoring and Troubleshooting

### View Logs

```bash
# View edge function logs
supabase functions logs sync-to-mongodb

# View recent logs with follow
supabase functions logs sync-to-mongodb --follow
```

### Check Sync Queue

```bash
# View failed sync attempts
supabase db psql -c "SELECT * FROM public.sync_queue WHERE status = 'failed';"

# View pending sync attempts
supabase db psql -c "SELECT * FROM public.sync_queue WHERE status = 'pending';"

# Process pending items manually
supabase db psql -c "SELECT public.process_sync_queue();"
```

### Manual Sync Operations

```bash
# Trigger bulk sync of all data
supabase db psql -c "SELECT public.trigger_bulk_sync();"

# Test individual table sync
curl -X POST "https://your-project.supabase.co/functions/v1/sync-to-mongodb" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync",
    "table": "public.expenses",
    "operation": "INSERT",
    "record": { "id": "test-id", "title": "Test Expense" }
  }'
```

### Common Issues

1. **MongoDB Connection Errors**:
   - Verify `MONGODB_URI` is correct
   - Check network connectivity
   - Ensure MongoDB user has write permissions

2. **Authentication Errors**:
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set
   - Check edge function permissions

3. **Sync Delays**:
   - Check edge function logs for errors
   - Monitor sync queue for failed attempts
   - Verify webhook URL configuration

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Group members can access shared group data
- Proper authorization for all operations

### Data Privacy

- Sensitive authentication data is filtered during sync
- Only necessary user profile data is synchronized
- All API calls require proper authentication

### Network Security

- Edge function uses HTTPS for all communications
- MongoDB connections should use TLS/SSL
- Service role keys should be kept secure

## Performance Optimization

### Indexing

MongoDB collections should have appropriate indexes:

```javascript
// Users collection
db.users.createIndex({ "email": 1 })
db.users.createIndex({ "created_at": 1 })

// User profiles collection
db.user_profiles.createIndex({ "user_id": 1 })

// Groups collection
db.groups.createIndex({ "created_by": 1 })
db.groups.createIndex({ "members": 1 })

// Expenses collection
db.expenses.createIndex({ "group_id": 1 })
db.expenses.createIndex({ "created_by": 1 })
db.expenses.createIndex({ "created_at": 1 })

// Settlements collection
db.settlements.createIndex({ "from_user": 1 })
db.settlements.createIndex({ "to_user": 1 })
db.settlements.createIndex({ "group_id": 1 })

// Notifications collection
db.notifications.createIndex({ "user_id": 1 })
db.notifications.createIndex({ "read": 1 })
```

### Batch Processing

The sync system processes changes in batches to optimize performance:
- Bulk sync processes 100 records at a time
- Failed sync attempts are retried up to 5 times
- Sync queue is processed periodically

## Integration with Existing Services

### Update Your Services

1. **Keep existing MongoDB connections** - Your services continue to read from MongoDB
2. **Update write operations** - New data should be written to Supabase
3. **Authentication** - Switch to Supabase Auth for user management

### Migration Strategy

1. **Phase 1**: Set up sync system alongside existing MongoDB
2. **Phase 2**: Run bulk sync to populate Supabase with existing data
3. **Phase 3**: Gradually migrate write operations to Supabase
4. **Phase 4**: Use MongoDB as read-only replica

### Example Service Update

```javascript
// Before: Direct MongoDB write
await db.collection('expenses').insertOne(expenseData);

// After: Write to Supabase (auto-syncs to MongoDB)
const { data, error } = await supabase
  .from('expenses')
  .insert(expenseData);
```

## Backup and Recovery

### Backup Strategy

1. **Supabase**: Automatic backups included in hosted plans
2. **MongoDB**: Continue existing backup procedures
3. **Sync Queue**: Monitor and backup sync queue for audit trail

### Recovery Procedures

1. **Data Loss in MongoDB**: Run bulk sync from Supabase
2. **Data Loss in Supabase**: Restore from Supabase backup
3. **Sync Failures**: Process sync queue to catch up

## Support and Maintenance

### Regular Maintenance

1. **Monitor sync queue** for failed attempts
2. **Review edge function logs** for errors
3. **Check MongoDB performance** and indexing
4. **Update dependencies** in edge function

### Scaling Considerations

- Edge functions auto-scale with Supabase
- MongoDB may need scaling based on data volume
- Consider read replicas for high-traffic scenarios

For additional support, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Deno Documentation](https://deno.land/manual) 