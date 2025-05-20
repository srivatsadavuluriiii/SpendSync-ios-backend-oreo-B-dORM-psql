/**
 * Algorithm Tests Runner
 * 
 * Simple script to run all algorithm-related unit tests
 */

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

console.log(`${colors.bright}${colors.blue}====================================${colors.reset}`);
console.log(`${colors.bright}${colors.blue}     SpendSync Algorithm Tests      ${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// List of test files to run
const testFiles = [
  'unit/min-cash-flow.algorithm.test.js',
  'unit/greedy.algorithm.test.js',
  'unit/friend-preference.algorithm.test.js'
];

// Track test results
let passedTests = 0;
let failedTests = 0;

// Run each test file
testFiles.forEach(testFile => {
  const testPath = path.join(__dirname, testFile);
  console.log(`${colors.bright}Running: ${colors.yellow}${testFile}${colors.reset}`);
  
  try {
    // Run Jest for this specific test file
    execSync(`npx jest ${testPath} --verbose`, { stdio: 'inherit' });
    console.log(`${colors.green}PASSED${colors.reset}\n`);
    passedTests++;
  } catch (error) {
    console.log(`${colors.red}FAILED${colors.reset}\n`);
    failedTests++;
  }
});

// Summary
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}`);
console.log(`${colors.bright}Test Summary: ${colors.reset}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Exit with appropriate code
process.exit(failedTests === 0 ? 0 : 1); 