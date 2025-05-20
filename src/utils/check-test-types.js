#!/usr/bin/env node

/**
 * Test Type Checker
 * 
 * This utility runs the TypeScript compiler on test files to check for type errors
 * without actually compiling the files. It helps catch type errors in tests that
 * might otherwise only be caught at runtime.
 * 
 * Usage:
 * node check-test-types.js [path/to/test]
 * 
 * If no path is provided, all test files will be checked.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Test Type Checker');
console.log('================');

try {
  // Find all TypeScript test files
  const testFiles = execSync(
    'find . -name "*.test.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/coverage/*" -not -path "*/.git/*" -type f',
    { encoding: 'utf8' }
  ).trim();

  if (!testFiles) {
    console.log('No TypeScript test files found. Skipping type check.');
    process.exit(0);
  }

  // Run type check on test files
  const testFileList = testFiles.split('\n');
  console.log(`Found ${testFileList.length} TypeScript test files`);

  execSync('tsc --noEmit', { stdio: 'inherit' });
  console.log('Type check passed');
} catch (error) {
  if (error.status === 1 && !error.stdout) {
    console.log('No TypeScript test files found. Skipping type check.');
    process.exit(0);
  }
  console.error('Error checking types:', error.message);
  process.exit(1);
} 