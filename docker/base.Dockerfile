# Use base Node.js image
FROM node:18-alpine

# Install necessary tools
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files first for better caching
COPY package*.json ./
COPY nodemon.json ./
COPY tsconfig.json ./

# Install dependencies with clean npm cache
RUN npm cache clean --force && \
    npm install && \
    npm install -g kill-port nodemon ts-node typescript @types/node

# Copy application source code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/logs && \
    mkdir -p /app/src && \
    chown -R appuser:appgroup /app && \
    chmod -R 755 /app

# Switch to non-root user
USER appuser

# Default command (can be overridden by specific services)
CMD ["npx", "nodemon", "--inspect=0.0.0.0:9229"] 