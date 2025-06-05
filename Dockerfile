# =========================
# Stage 1: Build Stage
# =========================
FROM oven/bun:1.2-debian AS builder

# Set working directory inside the container
WORKDIR /app

# Copy dependencies
COPY bun.lock package.json ./

# Install dependencies with Bun (cached layer)
RUN bun install --frozen-lockfile

# Copy rest of the application
COPY . .

# Build Next.js app
ENV SKIP_ENV_VALIDATION=true
ENV BETTER_AUTH_SECRET="VfraEUYmGz2YHKWqaoG5nztJImlzjS3n3Z1fgUlgSOU="
ENV BETTER_AUTH_TRUSTED_ORIGINS="http://localhost:3000"
RUN bun run build

# =========================
# Stage 2: Production Stage
# =========================
FROM oven/bun:debian AS runner

# Set working directory
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./next.config.js

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Run the app
CMD ["bun", "run", "start"]

