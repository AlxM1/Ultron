# Cortex — Activity Tracking & Monitoring
# Node.js + Hono + PostgreSQL

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3011

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 cortex

# Copy dependencies and source
COPY --from=deps --chown=cortex:nodejs /app/node_modules ./node_modules
COPY --chown=cortex:nodejs src ./src

USER cortex

EXPOSE 3011

CMD ["node", "src/index.js"]
