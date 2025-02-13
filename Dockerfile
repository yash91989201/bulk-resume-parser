FROM oven/bun AS base

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY /data/coolify/certs/glitchtip.bulk-resume-parser.yashraj-jaiswal.site/cert.pem /usr/local/share/ca-certificates/glitchtip.pem

RUN update-ca-certificates

COPY package.json .

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
