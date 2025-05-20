#!/usr/bin/env node

/**
 * Script to scan for potential TypeScript import errors in the codebase
 * 
 * Usage: node scripts/scan-typescript-errors.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Find all TypeScript files
exec('find src -name "*.ts" | grep -v "node_modules"', (error, stdout, stderr) => {
  if (error) {
    console.error(`${colors.red}Error finding TypeScript files:${colors.reset}`, error);
    return;
  }
  
  const files = stdout.trim().split('\n').filter(file => file);
  console.log(`${colors.green}Found ${files.length} TypeScript files${colors.reset}`);
  
  // Known JavaScript modules without proper type declarations
  const problematicModules = [
    'shared/middleware',
    'shared/services',
    'shared/utils',
    'shared/models',
    'shared/database'
  ];
  
  // Files with potential issues
  const issueFiles = [];
  
  // Check each file for imports of problematic modules
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    for (const module of problematicModules) {
      const regex = new RegExp(`import\\s+(?:\\{\\s*([^}]+)\\s*\\})?\\s+from\\s+['"]([^'"]*${module}[^'"]*)['"']`, 'g');
      
      if (regex.test(content)) {
        issueFiles.push({
          file,
          module,
          type: 'import'
        });
        break;
      }
    }
  });
  
  if (issueFiles.length > 0) {
    console.log(`\n${colors.yellow}Found ${issueFiles.length} files with potential TypeScript import issues:${colors.reset}\n`);
    
    const moduleCount = {};
    issueFiles.forEach(issue => {
      console.log(`${colors.cyan}${issue.file}${colors.reset} - ${colors.magenta}${issue.module}${colors.reset}`);
      moduleCount[issue.module] = (moduleCount[issue.module] || 0) + 1;
    });
    
    console.log(`\n${colors.yellow}Summary of problematic modules:${colors.reset}`);
    Object.entries(moduleCount).sort((a, b) => b[1] - a[1]).forEach(([module, count]) => {
      console.log(`${colors.magenta}${module}${colors.reset}: ${count} files`);
    });
    
    console.log(`\n${colors.green}Fix suggestions:${colors.reset}`);
    console.log(`1. Create declaration files for the problematic modules`);
    console.log(`2. Run the fix script on affected files:`);
    console.log(`   ${colors.cyan}find src -name "*.ts" | grep -v "node_modules" | xargs -I{} node scripts/fix-typescript-imports.js {}${colors.reset}`);
    console.log(`3. Consider converting key JavaScript modules to TypeScript`);
  } else {
    console.log(`\n${colors.green}No potential TypeScript import issues found!${colors.reset}`);
  }
}); 