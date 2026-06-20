# syntax=docker/dockerfile:1.6

############################
# Stage 1: Build Vite app
############################
FROM node:20-alpine AS builder

WORKDIR /app

# Cài deps trước để cache layer
COPY package*.json ./
RUN npm ci

# Biến môi trường Vite sẽ được truyền từ docker-compose khi build
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy source và build
COPY . .
RUN npm run build

############################
# Stage 2: Nginx runtime
############################
FROM nginx:1.27-alpine AS runtime

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
