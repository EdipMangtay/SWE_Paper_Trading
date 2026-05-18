# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------------
# Frontend (React + Vite SPA) served by nginx with API/WS reverse proxy.
# Multi-stage build keeps the final image lean (~30 MB).
# ------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve on 80 — published as 5173/8080 by docker-compose / cloud platform
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
