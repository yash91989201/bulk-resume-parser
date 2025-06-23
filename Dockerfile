# Stage 1: Build Stage
FROM oven/bun:1.2.17-debian AS builder

WORKDIR /app

COPY bun.lock package.json ./

RUN bun install --freeze-lockfile

COPY . .

ARG S3_ENDPOINT
ARG BETTER_AUTH_SECRET
ARG NEXT_PUBLIC_BETTER_AUTH_URL

ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}

ENV SKIP_ENV_VALIDATION=true

RUN bun run build

# Stage 2: Production Stage
FROM node:24-alpine3.21  AS runner

WORKDIR /app

COPY --from=builder /app/.next/standalone/ . 
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node","server.js"]
