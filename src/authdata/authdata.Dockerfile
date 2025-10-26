# Auth + Data Service Dockerfile
FROM node:20-slim AS base

# Use slim image → smaller attack surface, faster deploy
WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    curl \
    g++ \
 && rm -rf /var/lib/apt/lists/*
RUN npm install

COPY . .

EXPOSE 3003
CMD ["npm", "start"]
