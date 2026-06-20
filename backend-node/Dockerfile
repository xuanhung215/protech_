# syntax=docker/dockerfile:1.6

############################
# Stage 1: Build TypeScript
############################
FROM node:20-alpine AS builder

WORKDIR /app

# Cài deps trước để tận dụng Docker layer cache
COPY package*.json ./
RUN npm ci

# Copy source và build
COPY tsconfig.json ./
COPY src ./src
COPY views ./views
COPY static ./static
RUN npm run build

############################
# Stage 2: Production runtime
############################
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001

# Chỉ cài deps production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy build output + assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/views ./views
COPY --from=builder /app/static ./static

# Thư mục uploads sẽ được mount từ host (nếu cần)
RUN mkdir -p /app/uploads

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/products || exit 1

CMD ["node", "dist/index.js"]
