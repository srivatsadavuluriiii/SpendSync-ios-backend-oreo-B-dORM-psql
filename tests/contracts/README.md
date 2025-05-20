# Contract Testing with Pact

This directory contains contract tests using the [Pact](https://pact.io/) framework. These tests verify that the API Gateway and microservices can communicate correctly according to the defined contract.

## Overview

Contract testing is a technique to ensure that services can communicate with each other as expected. In our implementation:

- **Consumer tests** (in this directory) define the expectations of the API Gateway when interacting with microservices
- **Provider tests** (in `../pact/providers`) verify that the services can meet those expectations

## Running Contract Tests

### ARM64 Architecture (Mac M1/M2/M3)

If you're running on an ARM64 Mac (M1, M2, or M3), you'll need to use Docker to run the Pact tests due to compatibility issues with the native Pact libraries:

```bash
# Run both consumer and provider tests using Docker
npm run pact:docker

# Or use the convenience script
./scripts/run-pact-tests.sh
```

### Intel Architecture

On Intel-based machines, you can run the tests directly:

```bash
# Run consumer tests
npm run test:contract

# Run provider verification tests
npm run test:pact

# Or use the convenience script
./scripts/run-pact-tests.sh
```

## Known Issues

### ARM64 Compatibility

The Pact native library has known compatibility issues with ARM64 architecture. While tests might appear to pass, you may see error messages like:

```
!!!!!!!!! PACT CRASHED !!!!!!!!!!
The pact consumer core returned false...
```

These errors often prevent pact files from being generated correctly. Solutions include:

1. Using Docker with the AMD64 platform (recommended)
2. Using Rosetta 2 (arch -x86_64 command)
3. Setting up a CI pipeline on an Intel-based runner

### Pact File Generation

If no pact files are generated in the `pacts/` directory after running tests, try:

1. Using Docker instead of native execution
2. Running on an Intel-based machine
3. Manually creating the directory structure for pacts

## Test Structure

### Consumer Tests

- `api-gateway-user-service.pact.test.js`: Tests the interaction between the API Gateway and the User Service

### Provider Tests

Provider tests are located in the `../pact/providers` directory:

- `user-service.provider.js`: Verifies that the User Service meets the expectations defined by the API Gateway

## Adding New Contract Tests

To add a new contract test:

1. Create a new consumer test file following the naming pattern: `consumer-provider.pact.test.js`
2. Define the interactions between the consumer and provider
3. Create a corresponding provider verification test in `../pact/providers`

## Pact Broker (For CI/CD Integration)

For CI/CD integration, we recommend setting up a Pact Broker. This allows for:
- Central storage of contracts
- Verification of contracts during the CI/CD pipeline
- Preventing breaking changes from being deployed

See the [Pact Broker documentation](https://docs.pact.io/pact_broker) for details on setup. 