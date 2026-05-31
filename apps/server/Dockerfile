# syntax=docker/dockerfile:1
ARG NODE_VERSION=20.19.0

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/server/package.json ./apps/server/package.json

# Build with repository root as context:
# docker build -f apps/server/Dockerfile .
RUN npm ci --workspace=@veriworkly/server --include=dev --legacy-peer-deps

COPY apps/server/prisma ./apps/server/prisma
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY apps/server/src ./apps/server/src

RUN npm run db:generate --workspace=@veriworkly/server \
    && npm run build --workspace=@veriworkly/server \
    && npm prune --omit=dev --legacy-peer-deps

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV PORT=8080

RUN apk add --no-cache openssl

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/package*.json /app/
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/server/package.json ./package.json
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/prisma ./prisma

USER app
EXPOSE 8080

CMD ["node", "dist/index.js"]
