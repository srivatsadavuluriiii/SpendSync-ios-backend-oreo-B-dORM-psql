# SpendSync Testing

This directory contains various tests for the SpendSync backend microservices.

## Test Categories

- **Contract Tests** (`contracts/`): Verify interactions between microservices using Pact
- **Integration Tests** (`integration/`): Test integration between services
- **Unit Tests** (inside each service's directory): Test individual components

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:contract

# Run tests for specific services
npm run test:user
npm run test:expense
npm run test:settlement
npm run test:notification
npm run test:gateway
```

## Contract Testing Status

We are implementing contract testing with Pact to verify interactions between microservices. Currently, there are some compatibility issues with Pact on ARM64 architecture (M1/M2/M3 Macs).

### Current Implementation

- Consumer tests for API Gateway <-> User Service interaction are defined
- Service proxy code adapted to support contract testing
- Provider verification tests have been set up
- Docker and Rosetta 2 compatibility solutions are available

### Known Issues

1. The Pact native library has compatibility issues on ARM64 architecture
2. Some errors appear in the mock server when running tests
3. The non-existent user test is failing (expected 404, got 500)

### Running Contract Tests

For best results on ARM64 (M1/M2/M3 Macs):

```bash
# Use the provided script that handles architecture detection
./scripts/run-pact-tests.sh

# Alternatively, use Rosetta 2 directly
arch -x86_64 npm run test:contract

# Or use Docker (requires Docker Desktop running)
docker-compose -f docker-compose.pact.arm64.yml up --build
```

### Next Steps

1. Fix non-existent user test (404 vs 500 error)
2. Add more contract tests for other service interactions
3. Set up continuous verification in CI/CD pipeline
4. Add a Pact Broker for contract management 