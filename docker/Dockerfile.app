# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG APP_FILTER
ARG DATABASE_URL=postgresql://khepree:khepree_local@127.0.0.1:5432/khepree_local
ARG S3_PUBLIC_BASE_URL=
ARG R2_PUBLIC_BASE_URL=
ENV DATABASE_URL=${DATABASE_URL}
ENV S3_PUBLIC_BASE_URL=${S3_PUBLIC_BASE_URL}
ENV R2_PUBLIC_BASE_URL=${R2_PUBLIC_BASE_URL}
RUN pnpm --filter "${APP_FILTER}" build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG APP_NAME=web
ARG PORT=3000
ENV APP_NAME=${APP_NAME}
ENV PORT=${PORT}
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 khepree \
  && useradd --system --uid 1001 --gid khepree khepree

COPY --from=builder --chown=khepree:khepree /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=khepree:khepree /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=builder --chown=khepree:khepree /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

USER khepree
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node apps/$APP_NAME/server.js"]
