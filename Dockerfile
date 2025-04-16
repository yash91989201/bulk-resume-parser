FROM oven/bun:debian AS base

WORKDIR /app

COPY package.json .

RUN bun install

COPY . . 

ENTRYPOINT [ "bun", "run", "dev" ]
