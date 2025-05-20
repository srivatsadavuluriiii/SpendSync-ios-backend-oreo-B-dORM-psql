#!/usr/bin/env node

/**
 * Script to fix TypeScript import issues in test files
 * 
 * Usage: node scripts/fix-typescript-imports.js <path-to-file>
 */

const fs = require('fs');
const path = require('path');

// Check if a file path is provided
if (process.argv.length < 3) {
  console.error('Please provide a file path to fix');
  console.error('Usage: node scripts/fix-typescript-imports.js <path-to-file>');
  process.exit(1);
}

const filePath = process.argv[2];

// Check if the file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace import statements with require statements for problematic modules
content = content.replace(
  /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+shared\/middleware[^'"]*)['"]/g,
  'const { $1 } = require(\'$2\')'
);

// Add type declaration for shared middleware if necessary
if (content.includes('shared/middleware') && !content.includes('declare module')) {
  const relativePath = path.relative(
    path.dirname(filePath),
    path.join(__dirname, '../src/shared/middleware')
  );

  // Add declaration at the top of the file
  const declaration = `/**
 * Declaration for middleware module
 */
declare module '${relativePath}' {
  import { Request, Response, NextFunction } from 'express';
  
  export function authenticate(req: Request, res: Response, next: NextFunction): void;
  export function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => Promise<void>;
  export function validate(schema: any): (req: Request, res: Response, next: NextFunction) => void;
  export function serviceAuth(req: Request, res: Response, next: NextFunction): void;
}

`;

  content = declaration + content;
}

// Write the modified content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log(`Fixed imports in ${filePath}`); 