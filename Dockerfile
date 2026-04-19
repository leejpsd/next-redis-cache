# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NODE_ENV=production
ARG REDIS_URL=redis://127.0.0.1:6379
ARG REVALIDATION_SECRET=build-time-secret
ARG WEBHOOK_SIGNING_SECRET=build-time-signing-secret
ARG APP_BASE_URL=http://localhost:3000
ARG DEPLOYMENT_VERSION=dev-build
ENV CACHE_HANDLER_FALLBACK=memory
ENV REDIS_URL=$REDIS_URL
ENV REVALIDATION_SECRET=$REVALIDATION_SECRET
ENV WEBHOOK_SIGNING_SECRET=$WEBHOOK_SIGNING_SECRET
ENV APP_BASE_URL=$APP_BASE_URL
ENV DEPLOYMENT_VERSION=$DEPLOYMENT_VERSION
ENV GIT_HASH=$DEPLOYMENT_VERSION
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 이전 로컬 빌드 아티팩트가 혹시 포함되더라도 제거하여 clean build 보장
RUN rm -rf .next node_modules/.cache
# Next 16은 기본이 Turbopack이라 --webpack 플래그를 명시적으로 사용한다.
# Docker 빌드가 실제로 webpack을 쓰는지 로그로 남겨 이후 트러블슈팅이 용이하게 한다.
RUN npx next build --webpack 2>&1 | tee /tmp/next-build.log \
  && grep -E "Next\.js.*\((webpack|Turbopack)\)" /tmp/next-build.log | head -3 \
  && if find .next/static/chunks -name "*.wizo.js" -o -name "turbopack-*.js" 2>/dev/null | grep -q .; then \
       echo "!!! Turbopack chunk signatures found despite --webpack flag"; \
       find .next/static/chunks -name "*.wizo.js" -o -name "turbopack-*.js" | head -5; \
       exit 1; \
     fi \
  && rm -f /tmp/next-build.log

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/incremental-cache-handler.js ./incremental-cache-handler.js
COPY --from=builder --chown=nextjs:nextjs /app/redis-handler.cjs ./redis-handler.cjs

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
