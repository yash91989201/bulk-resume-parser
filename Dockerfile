FROM oven/bun:debian AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl

RUN openssl s_client -connect glitchtip.bulk-resume-parser.yashraj-jaiswal.site:443 -showcerts </dev/null 2>/dev/null | sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' > /usr/local/share/ca-certificates/glitchtip.pem

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

ENTRYPOINT ["/bin/sh","-c", "bun server.js 2>&1 | tee /var/log/bulk-resume-parser/app.log"]
