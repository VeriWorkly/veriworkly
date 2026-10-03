# syntax=docker/dockerfile:1
ARG NODE_VERSION=20.19.0

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/server/package.json ./apps/server/package.json
# The server depends on two workspace packages. npm links them into node_modules as symlinks to
# packages/*, so their manifests must be present at install time and their built output at run
# time — without them the server's `prebuild` has nothing to build and the image's imports of
# @veriworkly/ats-engine and @veriworkly/profile-core resolve to nothing.
COPY packages/ats-engine/package.json ./packages/ats-engine/package.json
COPY packages/profile-core/package.json ./packages/profile-core/package.json
# Before the install, not after: the root `postinstall` runs `prisma generate`, which fails the
# whole `npm ci` when the schema is not there yet. It also makes `npm ci` the one place the
# client is generated.
COPY apps/server/prisma ./apps/server/prisma

# Build with repository root as context:
# docker build -f apps/server/Dockerfile .
RUN npm ci --workspace=@veriworkly/server --workspace=@veriworkly/ats-engine \
    --workspace=@veriworkly/profile-core --include=dev

COPY packages/ats-engine/tsconfig.json packages/ats-engine/tsconfig.node.json ./packages/ats-engine/
COPY packages/ats-engine/src ./packages/ats-engine/src
COPY packages/profile-core/tsconfig.json ./packages/profile-core/tsconfig.json
COPY packages/profile-core/src ./packages/profile-core/src
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY apps/server/src ./apps/server/src

RUN npm run build --workspace=@veriworkly/server \
    && npm prune --omit=dev

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV PORT=8080

RUN apk add --no-cache openssl

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/package*.json /app/
COPY --from=build /app/node_modules /app/node_modules
# Whole directories, not just package.json and dist: npm nests a dependency inside a workspace
# when its version conflicts with the root copy (better-auth and zod 3 under apps/server, zod
# under each package), and the runtime must find them where the lockfile put them. The packages
# are also the targets of the workspace symlinks in node_modules/@veriworkly.
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/server ./

USER app
EXPOSE 8080

CMD ["node", "dist/index.js"]
