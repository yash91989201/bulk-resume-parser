FROM oven/bun AS base

WORKDIR /app

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
