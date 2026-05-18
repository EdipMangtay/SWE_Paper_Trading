# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------------
# Backend (Express REST API + WebSocket price stream)
# Layered architecture image — production runtime only.
# ------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5002 \
    PRICE_STREAM_INTERVAL_MS=10000

# Run as a non-root user
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts

USER app
EXPOSE 5002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5002/api/health || exit 1

CMD ["node", "src/server.js"]
