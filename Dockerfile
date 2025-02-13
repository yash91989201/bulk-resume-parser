FROM oven/bun AS base

WORKDIR /app

COPY package.json .

ARG DATABASE_URL
ARG NODE_ENV
ARG BETTER_AUTH_URL
ARG BETTER_AUTH_SECRET="aXNjaGVzdGRhcmtibGFua2V0YnJ1c2hiaWxsdGh1bWJza3lidXJpZWRtYXR0ZXJibGk="
ARG BETTER_AUTH_TRUSTED_ORIGINS="https://bulk-resume-parser.yashraj-jaiswal.site"
ARG S3_ENDPOINT
ARG S3_ACCESS_KEY
ARG S3_SECRET_KEY
ARG S3_USE_SSL
ARG RABBITMQ_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL

RUN bun install

COPY . . 

RUN NODE_ENV=production SKIP_ENV_VALIDATION=1 bun run build

FROM oven/bun AS final

WORKDIR /app

COPY --from=base /app/.next/standalone .
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

EXPOSE 3000

CMD ["bun", "server.js"]
