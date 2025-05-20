# User Preferences System for SpendSync

This document explains the user preferences system implemented for the SpendSync settlement service.

## Overview

The user preferences system allows users to customize their experience by storing and retrieving various preferences related to currency display, notification settings, settlement algorithms, and UI display options.

## Data Model

The user preferences system stores the following types of preferences:

- **Default Currency**: Preferred currency for displaying amounts (e.g., USD, EUR, GBP)
- **Settlement Algorithm**: Preferred algorithm for generating settlement suggestions
- **Notification Settings**:
  - Email notifications (enable/disable)
  - Push notifications (enable/disable)
  - Reminder frequency
  - Types of notifications to receive
- **Display Settings**:
  - UI theme preference (light/dark/system)
  - Date format
  - Number format
- **Privacy Settings**:
  - Sharing preferences
  - Display name preferences

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/preferences` | Retrieve user preferences |
| PUT | `/api/preferences` | Update all user preferences |
| PATCH | `/api/preferences/section/:section` | Update a specific section of preferences |
| POST | `/api/preferences/reset` | Reset preferences to defaults |

### Specialized Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/preferences/notifications` | Get notification settings |
| POST | `/api/preferences/currency` | Set default currency |
| POST | `/api/preferences/algorithm` | Set preferred settlement algorithm |

## Integration with Features

### Settlement Suggestions

When a user requests settlement suggestions, the system considers:

1. The user's preferred settlement algorithm (if no algorithm is specified in the request)
2. The user's preferred currency for standardizing settlements across multiple currencies

Example:
```javascript
// If no algorithm parameter is provided, uses user's preferred algorithm
const algorithm = req.query.algorithm || userPreferences.settlementAlgorithm || 'minCashFlow';
```

### Settlement Creation

When creating a new settlement, the system uses the user's preferred currency if none is specified:

```javascript
// Use provided currency, or user's preferred currency, or fallback to USD
currency: currency || userPreferences.defaultCurrency || 'USD'
```

### Notifications

The notification system uses the user's preferences to determine:

1. Whether to send notifications at all
2. Which channels to use (email, push)
3. Frequency of reminders
4. Types of events to notify about

## Performance Considerations

### Caching

- User preferences are cached for fast access with a TTL of 1 hour
- Cache keys for API responses include user preference information when relevant
- Cache is invalidated when preferences are updated

### Default Preferences

- Default preferences are automatically created for new users
- This avoids checks for null/undefined preferences throughout the application

## Implementation Details

### Preference Sections

Preferences are organized into sections to allow targeted updates:

- `notifications`: Settings related to notifications
- `displaySettings`: UI and formatting preferences
- `privacySettings`: Privacy and sharing preferences

### Bulk Retrieval

For operations that need preferences for multiple users (e.g., group operations), the system supports bulk retrieval:

```javascript
const userPreferences = await userPreferenceService.getBulkUserPreferences(userIds);
```

## Testing

The user preferences system includes both unit tests and integration tests:

- Unit tests for service methods
- Unit tests for controllers
- Integration tests for API endpoints

## Future Enhancements

Planned enhancements for the user preferences system:

1. **Synchronization**: Real-time sync of preferences across devices
2. **Preference Templates**: Allow users to save and apply preference "templates"
3. **Import/Export**: Allow users to export and import preferences
4. **Analytics**: Track preference usage to improve defaults and user experience 