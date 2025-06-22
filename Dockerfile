# =========================
# Stage 1: Build Stage
# =========================
FROM oven/bun:1.2.17-debian  AS builder

WORKDIR /app

# Define build arguments for environment variables
ARG DATABASE_URL
ARG NODE_ENV=production
ARG BETTER_AUTH_URL
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_TRUSTED_ORIGINS
ARG S3_ENDPOINT
ARG S3_PORT
ARG S3_ACCESS_KEY
ARG S3_SECRET_KEY
ARG S3_USE_SSL
ARG RABBITMQ_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL

# Set these ARGs as ENV vars for the build process
ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=${NODE_ENV}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_TRUSTED_ORIGINS=${BETTER_AUTH_TRUSTED_ORIGINS}
ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV S3_PORT=${S3_PORT}
ENV S3_ACCESS_KEY=${S3_ACCESS_KEY}
ENV S3_SECRET_KEY=${S3_SECRET_KEY}
ENV S3_USE_SSL=${S3_USE_SSL}
ENV RABBITMQ_URL=${RABBITMQ_URL}
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}

# Copy lockfile and manifest first for caching
COPY bun.lock package.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the full app source
COPY . .


RUN bun run build

# RUN --mount=type=secret,id=BETTER_AUTH_SECRET,required=true BETTER_AUTH_SECRET=$(cat /run/secrets/BETTER_AUTH_SECRET) bun run build


# =========================
# Stage 2: Production Stage
# =========================
FROM oven/bun:1.2.17-debian  AS runner

WORKDIR /app

# Also define build arguments for the runner stage
ARG DATABASE_URL
ARG NODE_ENV=production
ARG BETTER_AUTH_URL
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_TRUSTED_ORIGINS
ARG S3_ENDPOINT
ARG S3_PORT
ARG S3_ACCESS_KEY
ARG S3_SECRET_KEY
ARG S3_USE_SSL
ARG RABBITMQ_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL

# Copy the standalone output — content, not folder
COPY --from=builder /app/.next/standalone/ . 

# Copy public assets and static files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=${NODE_ENV}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_TRUSTED_ORIGINS=${BETTER_AUTH_TRUSTED_ORIGINS}
ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV S3_PORT=${S3_PORT}
ENV S3_ACCESS_KEY=${S3_ACCESS_KEY}
ENV S3_SECRET_KEY=${S3_SECRET_KEY}
ENV S3_USE_SSL=${S3_USE_SSL}
ENV RABBITMQ_URL=${RABBITMQ_URL}
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}
ENV PORT=3000
EXPOSE 3000

# Run the Next.js standalone server with Bun
CMD ["bun", "run","server.js"]

