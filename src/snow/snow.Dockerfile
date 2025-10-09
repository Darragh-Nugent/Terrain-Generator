# Snowfall Simulation Service Dockerfile
FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    libpixman-1-dev \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

RUN npm install

COPY . .

EXPOSE 3001
CMD ["npm", "start"]
