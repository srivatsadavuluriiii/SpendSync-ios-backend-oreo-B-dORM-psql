#!/usr/bin/env node

/**
 * TypeScript Declaration File Generator
 * 
 * This utility scans the project for TypeScript interfaces and generates/updates
 * declaration files (.d.ts) to ensure proper type coverage across services.
 * 
 * Usage:
 * node generate-declaration-files.js [--scan] [--update]
 * 
 * Options:
 * --scan   Only scan for missing type declarations without updating
 * --update Generate and update all declaration files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  projectRoot: path.resolve(__dirname, '../..'),
  typesDir: path.resolve(__dirname, '../types'),
  serviceTypesDir: 'src/types',
  excludeDirs: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.git'
  ],
  middleware: {
    sharedPath: 'src/shared/middleware',
    declarationFile: 'index.d.ts',
    serviceDeclarationFile: 'shared-middleware.d.ts'
  }
};

/**
 * Scan the project for TypeScript files
 */
function scanTypeScriptFiles() {
  try {
    const cmd = `find ${CONFIG.projectRoot} -name "*.ts" | grep -v "${CONFIG.excludeDirs.join('\\|')}"`;
    const result = execSync(cmd, { encoding: 'utf8' });
    return result.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error scanning TypeScript files:', error.message);
    return [];
  }
}

/**
 * Extract interface and type definitions from TypeScript files
 */
function extractTypeDefinitions(files) {
  const typeDefinitions = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const interfaces = extractInterfaces(content);
      const types = extractTypeAliases(content);
      
      if (interfaces.length > 0 || types.length > 0) {
        typeDefinitions.push({
          file,
          interfaces,
          types
        });
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  }
  
  return typeDefinitions;
}

/**
 * Extract interfaces from TypeScript content
 */
function extractInterfaces(content) {
  const interfaceRegex = /export\s+interface\s+(\w+)(?:<[^>]+>)?\s*(?:extends\s+[^{]+)?\s*\{([^}]+)\}/g;
  const matches = [...content.matchAll(interfaceRegex)];
  
  return matches.map(match => ({
    name: match[1],
    content: match[0].trim()
  }));
}

/**
 * Extract type aliases from TypeScript content
 */
function extractTypeAliases(content) {
  const typeRegex = /export\s+type\s+(\w+)(?:<[^>]+>)?\s*=\s*([^;]+);/g;
  const matches = [...content.matchAll(typeRegex)];
  
  return matches.map(match => ({
    name: match[1],
    content: match[0].trim()
  }));
}

/**
 * Generate declaration files for each service
 */
function generateServiceDeclarationFiles(typeDefinitions) {
  // Group by service
  const serviceMap = new Map();
  
  for (const def of typeDefinitions) {
    // Extract service name from path
    const pathParts = def.file.split('/');
    const serviceIdx = pathParts.indexOf('services');
    
    if (serviceIdx !== -1 && pathParts.length > serviceIdx + 1) {
      const serviceName = pathParts[serviceIdx + 1];
      
      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, []);
      }
      
      serviceMap.get(serviceName).push(def);
    }
  }
  
  // Generate declaration files for each service
  for (const [serviceName, defs] of serviceMap.entries()) {
    const serviceTypesDir = path.join(
      CONFIG.projectRoot, 
      'src', 
      'services', 
      serviceName, 
      'src', 
      'types'
    );
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(serviceTypesDir)) {
      fs.mkdirSync(serviceTypesDir, { recursive: true });
    }
    
    // Generate index.d.ts
    const indexDts = generateIndexDeclarationFile(serviceName, defs);
    fs.writeFileSync(path.join(serviceTypesDir, 'index.d.ts'), indexDts);
    
    // Generate middleware declaration file
    const middlewareDts = generateMiddlewareDeclarationFile(serviceName);
    fs.writeFileSync(path.join(serviceTypesDir, CONFIG.middleware.serviceDeclarationFile), middlewareDts);
    
    console.log(`Generated declaration files for ${serviceName} service`);
  }
}

/**
 * Generate index.d.ts content for a service
 */
function generateIndexDeclarationFile(serviceName, defs) {
  const imports = [
    '/**',
    ` * Type definitions for the ${capitalizeFirstLetter(serviceName)} Service`,
    ' */',
    'import { ',
    '  BaseEntity,',
    '  ApiResponse,',
    '  PaginatedResponse',
    '} from "../../../../types";',
    '',
  ];
  
  const interfaces = [];
  const types = [];
  
  // Extract all interfaces and types
  for (const def of defs) {
    interfaces.push(...def.interfaces.map(i => i.content));
    types.push(...def.types.map(t => t.content));
  }
  
  return [
    ...imports,
    ...interfaces,
    '',
    ...types,
    ''
  ].join('\n');
}

/**
 * Generate middleware declaration file for a service
 */
function generateMiddlewareDeclarationFile(serviceName) {
  return `/**
 * TypeScript declaration file for shared middleware
 */
declare module '../../../../shared/middleware' {
  import { Request, Response, NextFunction } from 'express';
  import { 
    AuthOptions, 
    ValidationSchema,
    AuthenticatedRequest 
  } from '../../../../types/middleware';
  
  /**
   * Authentication middleware
   */
  export function authenticate(options?: AuthOptions): (req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * Async handler middleware
   */
  export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): 
    (req: Request, res: Response, next: NextFunction) => Promise<void>;
  
  /**
   * Service authentication middleware
   */
  export function serviceAuth(req: Request, res: Response, next: NextFunction): void;
  
  /**
   * Validation middleware
   */
  export function validate(
    schema: ValidationSchema, 
    source?: 'body' | 'query' | 'params' | 'all'
  ): (req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * Error handling middleware
   */
  export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void;
  
  /**
   * Rate limiting middleware
   */
  export function rateLimit(options: {
    windowMs?: number;
    max?: number;
    message?: string | object;
    statusCode?: number;
    keyGenerator?: (req: Request) => string;
  }): (req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * Request logging middleware
   */
  export function requestLogger(req: Request, res: Response, next: NextFunction): void;
  
  /**
   * Correlation ID middleware
   */
  export function correlationId(req: Request, res: Response, next: NextFunction): void;
}`;
}

/**
 * Generate a declaration file from a list of type definitions
 */
function generateDeclarationFile(filename, typeDefinitions) {
  const header = [
    '/**',
    ' * Generated TypeScript declaration file',
    ' * DO NOT EDIT DIRECTLY',
    ' */',
    ''
  ];
  
  const interfaces = [];
  const types = [];
  
  // Extract all interfaces and types
  for (const def of typeDefinitions) {
    interfaces.push(...def.interfaces.map(i => i.content));
    types.push(...def.types.map(t => t.content));
  }
  
  const content = [
    ...header,
    ...interfaces,
    '',
    ...types,
    ''
  ].join('\n');
  
  fs.writeFileSync(filename, content);
  console.log(`Generated declaration file: ${filename}`);
}

/**
 * Utility to capitalize the first letter of a string
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const scanOnly = args.includes('--scan');
  
  console.log('TypeScript Declaration File Generator');
  console.log('====================================');
  
  // Ensure the types directory exists
  if (!fs.existsSync(CONFIG.typesDir)) {
    fs.mkdirSync(CONFIG.typesDir, { recursive: true });
  }
  
  // Scan for TypeScript files
  console.log('Scanning for TypeScript files...');
  const files = scanTypeScriptFiles();
  console.log(`Found ${files.length} TypeScript files`);
  
  // Extract type definitions
  console.log('Extracting type definitions...');
  const typeDefinitions = extractTypeDefinitions(files);
  console.log(`Found ${typeDefinitions.length} files with type definitions`);
  
  // Generate declaration files
  if (!scanOnly) {
    console.log('Generating service declaration files...');
    generateServiceDeclarationFiles(typeDefinitions);
    
    console.log('Done!');
  }
}

// Run the main function
main(); 