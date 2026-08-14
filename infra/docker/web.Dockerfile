FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @temichev/web

COPY apps apps

ARG NEXT_PUBLIC_DATA_MODE=api
ARG NEXT_PUBLIC_API_BASE_URL=https://temichev-posthub.ru
ENV NEXT_PUBLIC_DATA_MODE=${NEXT_PUBLIC_DATA_MODE}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

WORKDIR /app/apps/web
RUN pnpm build

FROM node:22-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN corepack enable

COPY --chown=node:node --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/apps/web ./apps/web

WORKDIR /app/apps/web
USER node
CMD ["./node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
