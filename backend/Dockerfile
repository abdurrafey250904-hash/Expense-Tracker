# ---------- Application tier: Express API ----------
# Stage 1: install production dependencies only (cached unless package*.json changes)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Stage 2: minimal runtime image
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

# Amazon DocumentDB CA bundle: lets the same image connect to a managed DocumentDB cluster over verified TLS.
ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /app/certs/global-bundle.pem

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# Run as the unprivileged "node" user (least privilege inside the container).
USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "server.js"]
