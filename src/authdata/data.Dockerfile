# Auth + Data Service Dockerfile
FROM node:20-slim AS base

# Use slim image → smaller attack surface, faster deploy
WORKDIR /app

# Install only what's needed for node-gyp builds (if any native modules)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*
RUN npm ci --only=production

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:authdata"]
