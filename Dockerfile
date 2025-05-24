# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port (Railway uses PORT environment variable)
EXPOSE $PORT

# Start the application
CMD ["npm", "start"] 