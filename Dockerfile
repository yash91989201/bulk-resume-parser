FROM oven/bun AS base

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . . 

RUN bun run build

FROM oven/bun:alpine AS final

WORKDIR /app

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

EXPOSE 3000

# Start the application
CMD ["bun", "server.js"]
