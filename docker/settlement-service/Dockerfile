# Use Node.js image
FROM node:18-alpine

WORKDIR /app

# Install necessary tools
RUN apk add --no-cache curl

# Copy package files first
COPY package*.json ./
COPY tsconfig.json ./
COPY nodemon.json ./

# Install ALL dependencies including types
RUN npm install && \
    npm install -g nodemon ts-node typescript && \
    npm install --save swagger-ui-express yamljs @types/swagger-ui-express @types/yamljs @types/express @types/node @types/redis && \
    npm install --save redis @types/redis

# Copy source code
COPY . .

# Create health check endpoint
RUN mkdir -p /app/src/services/settlement-service/health && \
    echo 'import express from "express"; \
    const router = express.Router(); \
    router.get("/", (req, res) => res.status(200).json({ status: "ok" })); \
    export default router;' > /app/src/services/settlement-service/health/index.ts

# Create tsconfig for the service
RUN echo '{ \
  "compilerOptions": { \
    "target": "ES2020", \
    "module": "commonjs", \
    "lib": ["es2020"], \
    "strict": true, \
    "esModuleInterop": true, \
    "skipLibCheck": true, \
    "forceConsistentCasingInFileNames": true, \
    "moduleResolution": "node", \
    "resolveJsonModule": true, \
    "isolatedModules": true, \
    "noUnusedLocals": false, \
    "noUnusedParameters": false, \
    "noImplicitReturns": true, \
    "noFallthroughCasesInSwitch": true, \
    "allowJs": true, \
    "declaration": true, \
    "sourceMap": true, \
    "outDir": "./dist", \
    "baseUrl": ".", \
    "paths": { \
      "*": ["node_modules/*", "src/types/*"] \
    } \
  }, \
  "include": ["src/**/*"], \
  "exclude": ["node_modules", "**/*.spec.ts"] \
}' > /app/src/services/settlement-service/tsconfig.json

# Expose port
EXPOSE 3003

# Start service with TypeScript support
CMD ["npx", "nodemon", "--exec", "ts-node", "-r", "tsconfig-paths/register", "src/services/settlement-service/src/index.ts"] 