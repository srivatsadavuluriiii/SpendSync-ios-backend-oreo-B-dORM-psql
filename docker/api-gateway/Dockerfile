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

# Install dependencies with clean npm cache
RUN npm cache clean --force && \
    npm install && \
    npm install -g kill-port nodemon

# Copy application source code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/logs && \
    mkdir -p /app/src/api-gateway/health && \
    chown -R appuser:appgroup /app && \
    chmod -R 755 /app

# Switch to non-root user
USER appuser

# Add health check endpoint
RUN echo 'const express = require("express"); \
    const router = express.Router(); \
    router.get("/", (req, res) => res.status(200).json({ status: "ok" })); \
    module.exports = router;' > /app/src/api-gateway/health/index.js

# Expose API Gateway port and debug port
EXPOSE 4000 9229

# Start API Gateway in development mode with debugging enabled
CMD ["npx", "nodemon", "--inspect=0.0.0.0:9229", "src/api-gateway/index.js"] 