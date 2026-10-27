import "dotenv/config";

import { defineConfig } from "@prisma/config";

import { resolveMigrationUrl } from "./scripts/migrationUrl";

/**
 * Two URLs, two jobs. `DATABASE_URL` is what the runtime pool in `src/lib/prisma.ts` opens and may
 * point at a transaction pooler. Migrations take a Postgres advisory lock that does not survive a
 * pooler, so the CLI prefers `DIRECT_DATABASE_URL` when it is set. `SHADOW_DATABASE_URL` is only
 * read by `migrate dev` and by the drift guard (`migrate diff --from-migrations`), which replay the
 * migration history into an empty database.
 *
 * Nothing here throws when a variable is missing: `prisma generate` runs from the root
 * `postinstall` on machines that have no database at all, and the migrate commands report a
 * missing URL themselves. A migrate command does throw when it would fall back to a pooler
 * `DATABASE_URL` (V-251, `scripts/migrationUrl.ts`).
 */
const directUrl = resolveMigrationUrl(process.env, process.argv);

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: directUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
