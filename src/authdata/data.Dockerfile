# Auth + Data Service Dockerfile (debug toggle via --build-arg DEBUG=yes)
FROM node:20-slim AS base

WORKDIR /app

# install build deps (canvas etc.) and optionally debug tools
ARG DEBUG=no
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    libpixman-1-dev \
    # useful debug tools:
    curl \
    iputils-ping \
    net-tools \
    dnsutils \
    procps \
    less \
    vim \
    --no-install-recommends \
 && if [ "$DEBUG" = "no" ] ; then apt-get remove -y --purge vim less ; fi \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Expose the app port and optional Node inspector port
EXPOSE 3003
# Node inspector for debugging when you run debug image
EXPOSE 9229

# Healthcheck to help ECS/ALB determine container health
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3003/healthcheck || exit 1

# Default: production start
CMD ["npm", "start"]
