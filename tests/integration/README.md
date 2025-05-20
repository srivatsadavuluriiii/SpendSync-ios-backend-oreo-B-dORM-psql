# SpendSync Integration Tests

This directory contains integration tests for the SpendSync Settlement Service, focusing on testing the complete request flow between microservices.

## Overview

Integration tests verify that different parts of the application work together correctly. In our microservices architecture, this means testing:

1. Communication between services
2. Data flow across service boundaries  
3. End-to-end user scenarios
4. Error handling across multiple services

## Running Integration Tests

To run the integration tests:

```bash
npm run test:integration
```

This command uses a separate Jest configuration specifically for integration tests.

## Test Structure

The integration tests are organized as follows:

- `setup.js` - Contains utilities for setting up and tearing down test environment
- `setup.integration.js` - Jest-specific setup for integration tests
- `jest.config.integration.js` - Configuration for Jest when running integration tests
- `settlement.integration.test.js` - Tests for the settlement flow
- `expense-settlement.integration.test.js` - Tests for the integration between expense and settlement services

## Mock Services

Integration tests use `nock` to mock HTTP responses from other microservices. This allows us to test the integration points without requiring all services to be running.

Mock responses are configured to closely resemble the actual service responses, ensuring that the tests are as realistic as possible.

## What's Being Tested

Our integration tests focus on these key areas:

1. **Settlement Creation Flow**: Testing the creation of settlements, including notifications
2. **Settlement Suggestion Flow**: Testing the generation of settlement suggestions using different algorithms
3. **Settlement Status Update Flow**: Testing the update of settlement statuses
4. **Algorithm Comparison Flow**: Testing the comparison of different settlement algorithms
5. **Error Handling**: Testing proper error handling across service boundaries
6. **Cross-Service Integration**: Testing authentication propagation and service unavailability
7. **Expense-Settlement Integration**: Testing the flow from expenses to settlements
8. **Multi-Currency Handling**: Testing settlement suggestions with multiple currencies

## Adding New Integration Tests

When adding new integration tests:

1. Create a new file with the `.integration.test.js` suffix
2. Use the `setup.js` utilities for database and mock setup
3. Focus on testing the integration between services, not internal service logic
4. Mock only the minimum necessary to test the integration points
5. Clean up any resources created during tests in the afterEach/afterAll blocks

## Best Practices

- Make integration tests independent and isolated
- Mock external services consistently
- Test complete flows rather than isolated requests
- Include both happy path and error scenarios
- Keep test data realistic but minimal
- Avoid testing internal implementation details 