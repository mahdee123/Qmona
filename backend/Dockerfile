# Qmona API (Express + Mongoose). Multi-stage build; the runtime image has production dependencies only.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build
# The seed script reads its JSON data files at run time, so they ship next to the compiled script.
RUN mkdir -p dist/scripts/seed && cp -r scripts/seed/data dist/scripts/seed/data

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
ENV NODE_ENV=production PORT=4000 UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Uploaded images live on a mounted volume (/data/uploads) so they survive container replacement.
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health >/dev/null || exit 1
# Run node directly (not through npm) so SIGTERM reaches the app and it can shut down gracefully.
CMD ["node", "dist/src/server.js"]
