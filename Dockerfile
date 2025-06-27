# Multi-stage build for monolithic deployment
# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build

# Accept build arguments for React environment variables
ARG REACT_APP_GIPHY_KEY
ENV REACT_APP_GIPHY_KEY=$REACT_APP_GIPHY_KEY

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps --only=production

COPY client/ ./
RUN npm run build

# Stage 2: Setup backend and serve everything
FROM node:18-alpine AS production

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY . ./
RUN rm -rf client

# Copy built frontend from previous stage
COPY --from=frontend-build /app/client/build ./public

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Start the application
CMD ["node", "server.js"] 