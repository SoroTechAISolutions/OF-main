# Dockerfile for OF Agency Backend
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Run compiled JavaScript (production-like)
CMD ["node", "dist/index.js"]
