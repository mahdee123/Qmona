# Qmona frontend (Next.js) — multi-stage build producing a standalone server.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_SITE_URL=https://qmona.com
# next.config.ts bakes these into the build (rewrites + next/image allow-list).
ARG BACKEND_INTERNAL_URL=http://127.0.0.1:4000
ARG MEDIA_ORIGINS=http://localhost:4000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL \
    MEDIA_ORIGINS=$MEDIA_ORIGINS \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S qmona && adduser -S qmona -G qmona
COPY --from=build --chown=qmona:qmona /app/public ./public
COPY --from=build --chown=qmona:qmona /app/.next/standalone ./
COPY --from=build --chown=qmona:qmona /app/.next/static ./.next/static
USER qmona
EXPOSE 3000
CMD ["node", "server.js"]
