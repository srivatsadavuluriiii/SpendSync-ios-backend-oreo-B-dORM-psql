# Use base Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install nodemon globally
RUN npm install -g nodemon

# Copy service files
COPY src/services/notification-service/package*.json ./

# Install dependencies including dev dependencies
RUN npm install --include=dev

# Copy service source code
COPY src/services/notification-service/src ./src
COPY src/services/notification-service/__tests__ ./__tests__

# Set proper permissions
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose Notification Service port
EXPOSE 3004

# Start Notification Service in development mode
CMD ["npm", "run", "dev"] 