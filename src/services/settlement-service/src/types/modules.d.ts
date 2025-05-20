/**
 * Type declarations for local modules
 */

// Use wildcard pattern for config files
declare module '*/config/config' {
  export const config: {
    port: number;
    env: string;
    mongodb: {
      uri: string;
    };
    redis: {
      host: string;
      port: number;
    };
    [key: string]: any;
  };
}

// Use wildcard pattern for route files
declare module '*/routes' {
  import { Router } from 'express';
  export const settlementRoutes: Router;
}

// Use wildcard pattern for JSON files
declare module '*.json' {
  const value: any;
  export default value;
}

// Declare other modules that might be missing types
declare module 'body-parser';
declare module 'swagger-ui-express';
declare module 'yamljs';

declare module '*/config/monitoring' {
  import { RequestHandler } from 'express';
  export const prometheusMiddleware: RequestHandler;
  export const register: {
    contentType: string;
    metrics: () => Promise<string>;
  };
}

declare module '*/services/cache.service' {
  export const redisClient: {
    connected: boolean;
  };
}

declare module '*/services/job-queue.service' {
  export function getQueuesHealth(): Promise<Record<string, any>>;
}

declare module '*/routes/api.routes' {
  import { Router } from 'express';
  const router: Router;
  export default router;
}

declare module '*/routes/render.routes' {
  import { Router } from 'express';
  const router: Router;
  export = router;
}

declare module '*/controllers/payment.controller' {
  import { RequestHandler } from 'express';
  export const handleWebhook: RequestHandler;
}

interface Cache {
  redis?: any;
} 