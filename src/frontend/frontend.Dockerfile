# Frontend UI Dockerfile
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./

# Install dependencies and build static files
RUN npm ci
COPY . .
RUN npm run build

# Serve using a lightweight static file server
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
