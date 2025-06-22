# =========================
# Stage 1: Build Stage
# =========================
FROM oven/bun:1.2.17-debian  AS builder

WORKDIR /app

# Copy lockfile and manifest first for caching
COPY bun.lock package.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the full app source
COPY . .

# Build args
ARG S3_ENDPOINT
ARG BETTER_AUTH_SECRET

ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
# ENV SKIP_ENV_VALIDATION=true

RUN bun run build

# RUN --mount=type=secret,id=BETTER_AUTH_SECRET,required=true BETTER_AUTH_SECRET=$(cat /run/secrets/BETTER_AUTH_SECRET) bun run build


# =========================
# Stage 2: Production Stage
# =========================
FROM oven/bun:1.2.17-debian  AS runner

WORKDIR /app

# Copy the standalone output — content, not folder
COPY --from=builder /app/.next/standalone/ . 

# Copy public assets and static files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run the Next.js standalone server with Bun
CMD ["bun", "run","server.js"]

