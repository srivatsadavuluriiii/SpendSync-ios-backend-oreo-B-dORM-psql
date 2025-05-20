# SpendSync Settlement Service Tests

This directory contains test files for the Settlement Service, including comprehensive testing for core debt optimization algorithms.

## Testing Structure

- **Unit Tests**: These test individual functions and algorithms in isolation
  - `min-cash-flow.algorithm.test.js`: Tests the minimum cash flow algorithm
  - `greedy.algorithm.test.js`: Tests the greedy settlement algorithm
  - `friend-preference.algorithm.test.js`: Tests the friendship-optimized settlement algorithm

## Running Tests

### All Tests

To run all tests:

```bash
npm test
```

### Unit Tests Only

To run only unit tests:

```bash
npm run test:unit
```

### Algorithm Tests

To run the core algorithm tests specifically:

```bash
npm run test:algorithms
```

This will run the algorithm tests with detailed output and a summary.

## Test Coverage

To run tests with coverage reports:

```bash
npm test -- --coverage
```

Coverage reports will be generated in the `coverage` directory.

## Adding New Tests

### Algorithm Tests

When testing algorithms, follow these guidelines:

1. **Test Simple Cases**: Include straightforward test cases that verify basic functionality
2. **Test Edge Cases**: Include tests for empty inputs, circular debts, and other edge cases
3. **Test Balance Correctness**: Always verify that the final balances equal zero after settlements
4. **Test Specific Properties**: Each algorithm has unique properties that should be tested:
   - Minimum Cash Flow: Verify minimization of transaction count
   - Greedy: Verify largest debtors settle with largest creditors
   - Friend Preference: Verify friends settle with each other preferentially

### Mocking Dependencies

When necessary, mock external dependencies like database access:

```javascript
// Example of mocking a repository
jest.mock('../../src/repositories/settlement.repository', () => ({
  getSettlements: jest.fn().mockResolvedValue([/* mocked data */]),
  saveSettlement: jest.fn().mockResolvedValue(true)
}));
```

## Debugging Tests

For debugging failing tests, run with the `--verbose` flag:

```bash
npm test -- --verbose
```

You can also run a specific test file directly:

```bash
npx jest tests/unit/min-cash-flow.algorithm.test.js
``` 