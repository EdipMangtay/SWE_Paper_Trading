# syntax=docker/dockerfile:1.7
# ============================================================================
# Combined single-service image for Railway / Render / Fly / any PaaS.
#
# - Stage 1: builds the React SPA (Vite)
# - Stage 2: installs backend production deps
# - Stage 3: lean Node runtime that serves both the REST API + WebSocket *and*
#            the SPA static files from a single port — no nginx, no CORS.
#
# Just point Railway at this Dockerfile and set the env vars in README.md.
# ============================================================================

FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/. ./
RUN npm run build

FROM node:20-alpine AS backend-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5002 \
    PRICE_STREAM_INTERVAL_MS=10000

RUN addgroup -S app && adduser -S app -G app

COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY --from=frontend /fe/dist ./public

USER app

# PaaS providers (Railway, Render, Fly) override $PORT at runtime.
EXPOSE 5002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-5002}/api/health" || exit 1

CMD ["node", "src/server.js"]
