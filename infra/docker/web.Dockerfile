FROM node:22-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter @temichev/web

COPY apps apps

WORKDIR /app/apps/web
CMD ["pnpm", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
