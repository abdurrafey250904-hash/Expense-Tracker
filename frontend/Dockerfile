# ---------- Web tier: React SPA served by Nginx ----------
# Stage 1: build the static bundle
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# The browser calls the API on the same origin (/api); Nginx proxies it to the app tier.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: unprivileged Nginx (listens on 8080, runs as non-root)
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
# Upstream for /api and the DNS resolver are injected at start-up via envsubst templates.
ENV API_UPSTREAM=app:5000 \
    NGINX_RESOLVER=127.0.0.11
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
