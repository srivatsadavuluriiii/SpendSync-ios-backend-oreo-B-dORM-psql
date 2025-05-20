# Extend from base
FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY nodemon.json ./

# Install dependencies
RUN npm install && \
    npm install -g nodemon && \
    npm install moment@latest --save

# Copy source code
COPY . .

# Create health check endpoint
RUN mkdir -p /app/src/services/analytics-service/health && \
    echo 'const express = require("express"); \
    const router = express.Router(); \
    router.get("/", (req, res) => res.status(200).json({ status: "ok" })); \
    module.exports = router;' > /app/src/services/analytics-service/health/index.js

# Expose port
EXPOSE 3005

# Start service
CMD ["npx", "nodemon", "src/services/analytics-service/index.js"] 