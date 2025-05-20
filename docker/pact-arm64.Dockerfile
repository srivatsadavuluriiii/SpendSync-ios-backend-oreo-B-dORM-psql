FROM --platform=linux/amd64 node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Command to run tests
CMD ["npm", "run", "test:contract"] 