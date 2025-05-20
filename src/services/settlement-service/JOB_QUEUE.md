# Background Job Queue System for SpendSync

This document explains the background job queue system implemented for the SpendSync settlement service.

## Overview

The job queue system uses [Bull](https://github.com/OptimalBits/bull), a Redis-based queue for Node.js, to handle asynchronous tasks such as email notifications and settlement reminders.

## Key Features

- **Multiple Queue Types**: Separate queues for different task types (emails, reminders, settlements)
- **Delayed Jobs**: Support for scheduling jobs to run in the future
- **Retries**: Automatic retry with exponential backoff for failed jobs
- **Metrics**: Prometheus metrics for monitoring job processing
- **Graceful Shutdown**: Proper handling of job queues during service shutdown

## Queue Configuration

### Environment Variables

Configure Redis connection in your environment variables or `.env` file:

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_JOB_QUEUE_DB=1
```

### Job Queues

The system includes the following job queues:

1. **Email Queue**: Processes email notifications
2. **Reminder Queue**: Handles settlement reminders
3. **Settlement Queue**: Processes settlement-related tasks

## Job Types

### Email Notifications

Jobs for sending email notifications to users:

```javascript
// Example: Scheduling an email notification
await addEmailNotificationJob({
  userId: '123',
  email: 'user@example.com',
  subject: 'Settlement Reminder',
  templateType: 'settlement_reminder',
  templateData: {
    settlementId: 'abc123',
    amount: 50,
    currency: 'USD'
  }
});
```

### Settlement Reminders

Jobs for sending reminders about pending settlements:

```javascript
// Example: Scheduling a settlement reminder
await addSettlementReminderJob({
  settlementId: 'abc123',
  userId: '123',
  dueDate: new Date('2023-12-31'),
  reminderType: 'initial'
});
```

### Settlement Processing

Jobs for processing settlement-related tasks:

```javascript
// Example: Schedule a payment status check
await addSettlementProcessingJob({
  settlementId: 'abc123',
  processType: 'payment_status_check'
});
```

## Processor Types

### Email Processor

Processes email notification jobs. In the current implementation, it simulates sending emails, but in a production environment, it would integrate with an email service like SendGrid, Mailgun, etc.

### Reminder Processor

Manages the reminder lifecycle for settlements:

- Sends initial reminders when a settlement is created
- Schedules follow-up reminders based on configurable intervals
- Sends final reminders when a settlement is due
- Handles overdue notifications

### Settlement Processor

Handles various settlement-related background tasks:

- **Auto-Complete**: Automatically completes settlements based on payment status
- **Payment Status Check**: Periodically checks payment status for pending settlements
- **Settlement Notification**: Sends notifications about settlement events
- **Periodic Reminder**: Sets up the reminder schedule for settlements

## Scheduling Jobs

Jobs are scheduled automatically based on settlement lifecycle events:

1. **Settlement Creation**: When a settlement is created, notification and reminder jobs are scheduled
2. **Status Update**: When a settlement status changes, relevant notifications are triggered
3. **Payment Update**: When a payment status changes, appropriate jobs are scheduled based on the status

## Retry Strategy

Failed jobs are automatically retried with an exponential backoff:

- Default: 3 retry attempts
- Backoff: Exponential with initial delay of 1 second
- Jobs that fail all retry attempts are stored for later inspection

## Monitoring

### Metrics

The following Prometheus metrics are available:

- `job_processing_total`: Count of jobs processed by queue and status
- `job_processing_duration_seconds`: Histogram of job processing time by queue and status
- `email_notifications_total`: Count of email notifications by type and status
- `settlement_reminders_total`: Count of settlement reminders by type and status
- `settlement_processing_total`: Count of settlement processing jobs by type and status

### Health Endpoint

A health endpoint is available at `/health/queues` to check the status of all job queues:

```json
{
  "status": "UP",
  "queues": {
    "email": {
      "waiting": 0,
      "active": 1,
      "completed": 120,
      "failed": 5,
      "delayed": 3
    },
    "reminders": { ... },
    "settlement": { ... }
  },
  "timestamp": "2023-10-17T14:22:33.412Z"
}
```

## Maintenance

### Viewing Failed Jobs

Failed jobs are stored in Redis and can be inspected using the Bull administration UI or Redis commands.

### Clearing Stuck Jobs

Stuck jobs can be cleaned up by:

1. Using the Bull admin UI
2. Using Redis commands directly
3. Implementing an administrative endpoint to manage queues

## Best Practices

1. **Job Data Size**: Keep job data small; store large data in the database and reference by ID
2. **Idempotent Processing**: Ensure job processors are idempotent (can be run multiple times safely)
3. **Error Handling**: Use proper error handling and logging in job processors
4. **Processing Time**: Keep job processing time short; break long tasks into smaller subtasks
5. **Monitoring**: Regularly check job queue health and metrics to identify issues 