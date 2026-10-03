# syntax=docker/dockerfile:1
# Image for @veriworkly/site (Next.js, standalone output).

ARG NODE_VERSION=20.19.0

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package*.json ./
# The site's workspaces. With only the root manifest present npm installs the root devDependencies
# and nothing else — no Next, no React, and nothing the ATS engine needs to build.
COPY apps/site/package.json ./apps/site/package.json
COPY packages/ats-engine/package.json ./packages/ats-engine/package.json
COPY packages/ui/package.json ./packages/ui/package.json
# `--ignore-scripts`: the root `postinstall` generates the server's Prisma client, and the server
# workspace is not in this image, so it fails the whole install. Nothing the site builds needs an
# install script — esbuild ships its binary as a platform package, and Prisma is the server's.
RUN npm ci --ignore-scripts --workspace=@veriworkly/site --workspace=@veriworkly/ats-engine \
    --workspace=@veriworkly/ui

FROM base AS builder
ARG NEXT_PUBLIC_BACKEND_URL
ARG SITE_URL
ARG BACKEND_INTERNAL_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV SITE_URL=${SITE_URL}
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
# Opts next.config.ts into `output: "standalone"`; see the comment there.
ENV BUILD_STANDALONE=1
# The whole install, not only the root node_modules: workspaces keep their own nested
# node_modules (the ATS engine resolves its zod there). .dockerignore excludes node_modules from
# the build context, so the source copy below does not overwrite them.
COPY --from=deps /app ./
COPY . .
RUN npm run build:site

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# The standalone bundle mirrors the monorepo layout, so server.js lives at apps/site/server.js
# and its sibling public/ and .next/static/ must be restored at the same depth.
COPY --from=builder --chown=nextjs:nextjs /app/apps/site/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/apps/site/.next/static ./apps/site/.next/static
COPY --from=builder --chown=nextjs:nextjs /app/apps/site/public ./apps/site/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/site/server.js"]
