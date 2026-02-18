# Zing Directory App - Optimized Multi-Stage Docker Build
# Produces ~150MB image (vs ~3GB single-stage)

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

# Required for native modules (sharp, etc.)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files (lockfile required for reproducible builds)
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for build)
# --frozen-lockfile ensures exact versions from lockfile are installed
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm for build commands
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment
ENV NODE_ENV=production

# NEXT_PUBLIC_* variables are embedded at BUILD time
# Pass these via --build-arg when building the image
#
# Example:
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
#     -t zing-app .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_PIPEDREAM_GBP_OAUTH_APP_ID
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_PIPEDREAM_GBP_OAUTH_APP_ID=$NEXT_PUBLIC_PIPEDREAM_GBP_OAUTH_APP_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build Next.js with standalone output
RUN pnpm build

# ============================================
# Stage 3: Production Runner (Minimal)
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the standalone output (includes minimal node_modules)
COPY --from=builder /app/.next/standalone ./

# Copy static files (not included in standalone by default)
COPY --from=builder /app/.next/static ./.next/static

# Copy public folder (images, etc.)
COPY --from=builder /app/public ./public

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname for Docker networking
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# ============================================
# RUNTIME CONFIGURATION
# ============================================
# Server-side secrets are passed at RUNTIME via -e flags.
# These are NOT embedded in the image.
#
# Required:
#   -e HUBSPOT_ACCESS_TOKEN=pat-na1-xxx
#   -e SUPABASE_SERVICE_ROLE_KEY=eyJ...
#
# Optional:
#   -e BRIGHTLOCAL_API_KEY=xxx
#   -e CRON_SECRET=xxx
#   -e PIPEDREAM_API_KEY=xxx
#
# Example run command:
#   docker run -p 3000:3000 \
#     -e HUBSPOT_ACCESS_TOKEN=pat-na1-... \
#     -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
#     zing-app
#
# Or use an env file:
#   docker run -p 3000:3000 --env-file .env.production zing-app
# ============================================

# Start the standalone server
CMD ["node", "server.js"]
