# TypeScript Import Fixes

## Problem

TypeScript files might have errors when importing JavaScript modules without type declarations, like:

```
Could not find a declaration file for module '../../../../shared/middleware'. '/Users/carson/Downloads/SpendSync-ios-backend-oreo/src/shared/middleware/index.js' implicitly has an 'any' type.
```

## Solutions

### Option 1: Create a Declaration File

Create a `.d.ts` file for the module:

```typescript
// src/shared/middleware/index.d.ts
import { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction): void;
export function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export function serviceAuth(req: Request, res: Response, next: NextFunction): void;
export function validate(schema: any): (req: Request, res: Response, next: NextFunction) => void;
```

### Option 2: Use require() Instead of import

Change TypeScript imports to use CommonJS-style requires:

```typescript
// Before
import { authenticate } from '../../../../shared/middleware';

// After
const { authenticate } = require('../../../../shared/middleware');
```

### Option 3: Use Inline Declaration

Add a declaration at the top of the file:

```typescript
declare module '../../../../shared/middleware' {
  import { Request, Response, NextFunction } from 'express';
  
  export function authenticate(req: Request, res: Response, next: NextFunction): void;
  export function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => Promise<void>;
  export function validate(schema: any): (req: Request, res: Response, next: NextFunction) => void;
  export function serviceAuth(req: Request, res: Response, next: NextFunction): void;
}
```

### Option 4: Use the Provided Script

For bulk fixes, use the provided script:

```bash
# Fix a single file
node scripts/fix-typescript-imports.js path/to/file.ts

# Fix multiple files (bash)
find src -name "*.ts" | grep -v "node_modules" | xargs -I{} node scripts/fix-typescript-imports.js {}
```

## Best Practices

1. When creating new JavaScript modules, add TypeScript declarations from the start
2. Use TypeScript for new code to avoid these issues
3. Consider gradually migrating JavaScript files to TypeScript 