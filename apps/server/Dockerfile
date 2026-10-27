# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.23.3

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/server/package.json ./apps/server/package.json
# The server depends on one workspace package. npm links it into node_modules as a symlink to
# packages/profile-core, so its manifest must be present at install time and its built output at
# run time — without them the server's `prebuild` has nothing to build and the image's imports of
# @veriworkly/profile-core resolve to nothing. @veriworkly/ats-engine comes from npm, built.
COPY packages/profile-core/package.json ./packages/profile-core/package.json
# Before the install, not after: the root `postinstall` runs `prisma generate`, which fails the
# whole `npm ci` when the schema is not there yet. It also makes `npm ci` the one place the
# client is generated.
COPY apps/server/prisma ./apps/server/prisma

# Build with repository root as context:
# docker build -f apps/server/Dockerfile .
# --legacy-peer-deps, as every CI job installs (V-161): without it a peer conflict CI tolerates
# would break only the image build.
RUN npm ci --legacy-peer-deps --workspace=@veriworkly/server --workspace=@veriworkly/profile-core --include=dev

COPY packages/profile-core/tsconfig.json ./packages/profile-core/tsconfig.json
COPY packages/profile-core/src ./packages/profile-core/src
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json
# The Prisma CLI reads the datasource URL from prisma.config.ts; `migrate deploy` (compose service
# `migrate`, run from this stage) fails without it.
COPY apps/server/prisma.config.ts ./apps/server/prisma.config.ts
# prisma.config.ts imports this helper; without it `prisma generate` (prebuild) and `migrate
# deploy` cannot load the config (V-343). tests/config/dockerfile-install.test.ts checks it.
COPY apps/server/scripts/migrationUrl.ts ./apps/server/scripts/migrationUrl.ts
COPY apps/server/src ./apps/server/src

RUN npm run build --workspace=@veriworkly/server

# Dev dependencies are dropped in a separate stage so the `build` stage keeps the Prisma CLI:
# compose runs `prisma migrate deploy` from it (service `migrate`) before the API starts.
FROM build AS pruned
RUN npm prune --omit=dev --legacy-peer-deps

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV PORT=8080

RUN apk add --no-cache openssl

RUN addgroup -S app && adduser -S app -G app

COPY --from=pruned /app/package*.json /app/
COPY --from=pruned /app/node_modules /app/node_modules
# Whole directories, not just package.json and dist: npm nests a dependency inside a workspace
# when its version conflicts with the root copy (nothing is nested today; every workspace is on
# one zod and one better-auth), and the runtime must find it where the lockfile put it. The
# packages are also the targets of the workspace symlinks in node_modules/@veriworkly.
COPY --from=pruned /app/packages /app/packages
COPY --from=pruned /app/apps/server ./

USER app
EXPOSE 8080

CMD ["node", "dist/index.js"]
