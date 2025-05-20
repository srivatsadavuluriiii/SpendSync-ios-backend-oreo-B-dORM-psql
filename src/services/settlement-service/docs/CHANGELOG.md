# API Changelog

This document tracks changes to the SpendSync Settlement Service API across versions.

## API Version 1.0.0 (v1) - Current

Initial release of the Settlement Service API with the following features:

### Endpoints

#### Settlements
- `GET /api/v1/settlements/suggestions/{groupId}` - Get settlement suggestions for a group
- `POST /api/v1/settlements` - Create a new settlement
- `GET /api/v1/settlements/group/{groupId}` - Get all settlements for a group
- `GET /api/v1/settlements/{settlementId}` - Get a specific settlement by ID
- `PATCH /api/v1/settlements/{settlementId}/status` - Update a settlement's status
- `GET /api/v1/settlements/user` - Get all settlements for the current user
- `GET /api/v1/settlements/compare-algorithms/{groupId}` - Compare different settlement algorithms

#### Payments
- `POST /api/v1/payments/initiate` - Initiate a payment for a settlement
- `GET /api/v1/payments/methods` - Get available payment methods
- `GET /api/v1/payments/status/{paymentId}` - Check payment status
- `POST /api/v1/payments/webhook` - Handle payment provider webhooks

#### User Preferences
- `GET /api/v1/preferences` - Get user preferences
- `PUT /api/v1/preferences` - Update user preferences
- `PATCH /api/v1/preferences/currency` - Update default currency preference
- `PATCH /api/v1/preferences/algorithm` - Update preferred settlement algorithm

#### Data Export (Added July 2024)
- `GET /api/v1/export/user` - Export user settlements data
- `GET /api/v1/export/group/{groupId}` - Export group settlements data

### Key Features
- Multiple settlement optimization algorithms
- Multi-currency support
- Payment integration
- User preferences
- Data export in multiple formats (CSV, Excel, JSON)

## Future API Versions

### API Version 2.0.0 (v2) - Planned

Planned features and improvements:
- Enhanced settlement algorithms
- Additional export formats
- Batch settlement operations
- Advanced filtering and sorting options

## Deprecation Schedule

| API Version | Deprecation Date | End-of-Life Date | Status |
|-------------|------------------|------------------|--------|
| v1          | Not scheduled    | Not scheduled    | Active | 