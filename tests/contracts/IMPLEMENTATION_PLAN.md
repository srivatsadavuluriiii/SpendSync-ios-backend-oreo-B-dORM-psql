# Contract Testing Implementation Plan

This document outlines the steps to fully implement contract testing across the SpendSync microservices.

## Current Status

- ✅ Basic contract testing infrastructure set up
- ✅ Initial consumer test for API Gateway -> User Service implemented
- ✅ Provider verification test structure created
- ✅ ARM64 compatibility solutions documented
- ⚠️ Issues with Pact on ARM64 architecture need resolution

## Phase 1: Complete Initial Implementation

1. **Fix ARM64 Compatibility Issues**
   - Complete Docker solution for reliable execution on M1/M2/M3 Macs
   - Test on Intel architecture to confirm proper pact file generation

2. **Complete User Service Provider Tests**
   - Extend provider tests to cover all API Gateway interactions with User Service
   - Implement proper state handlers for test data generation
   - Test with real service (not just mocks)

3. **CI Pipeline Integration**
   - Add contract test job to CI workflow
   - Ensure tests run on compatible architecture
   - Store and publish pact files as artifacts

## Phase 2: Expand Contract Testing Coverage

1. **API Gateway <-> Expense Service**
   - Implement consumer tests for expense operations
   - Create provider verification tests
   - Include common scenarios like expense creation, retrieval, splits

2. **API Gateway <-> Settlement Service**
   - Implement consumer tests for settlement operations
   - Create provider verification tests
   - Cover debt calculation and settlement plan generation

3. **API Gateway <-> Notification Service**
   - Implement consumer tests for notification operations
   - Create provider verification tests
   - Test notification delivery and preference management

## Phase 3: Advanced Contract Testing

1. **Set Up Pact Broker**
   - Deploy Pact Broker (self-hosted or use Pactflow)
   - Configure CI/CD to publish contracts to broker
   - Implement provider verification against broker

2. **Service-to-Service Contracts**
   - Define contracts between microservices (not just via API Gateway)
   - Example: Settlement Service -> Notification Service
   - Example: Expense Service -> Settlement Service

3. **Consumer-Driven Contract Enforcement**
   - Use can-i-deploy checks in deployment pipeline
   - Prevent deployment of breaking changes
   - Implement contract versioning

## Phase 4: Continuous Improvement

1. **Contract Testing Dashboard**
   - Create dashboard showing contract compliance status
   - Track contract coverage over time
   - Incorporate into DevOps metrics

2. **Contract Testing Documentation**
   - Create detailed documentation of all service contracts
   - Use contract as API documentation
   - Integrate with API documentation

3. **Training and Adoption**
   - Train team on contract testing principles
   - Establish process for new service contracts
   - Create templates for new contract tests

## Resources

- [Pact Documentation](https://docs.pact.io/)
- [Contract Testing Best Practices](https://martinfowler.com/articles/consumerDrivenContracts.html)
- [Pact Broker Documentation](https://docs.pact.io/pact_broker/overview) 