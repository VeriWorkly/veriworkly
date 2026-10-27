/**
 * Runs a Prisma CLI command only against a local database (V-209). `db:migrate` (`migrate dev`,
 * which can reset the database) and `db:drift` (which replays history into the shadow database)
 * go through here; `db:migrate:deploy` does not, because the release step runs it against
 * production on purpose.
 *
 *   tsx scripts/guarded-prisma.ts migrate dev [--allow-production] [prisma args…]
 *
 * Loads `.env` the way `prisma.config.ts` does, so the check sees the URL Prisma would use.
 * The exit code of the Prisma command is passed through (the drift guard relies on exit 2).
 */
import "dotenv/config";

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertLocalDatabase, prismaDatabaseUrls } from "#lib/databaseTarget";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--allow-production");

try {
  assertLocalDatabase(`prisma ${args.slice(0, 2).join(" ")}`, prismaDatabaseUrls());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const prismaEntry = createRequire(import.meta.url).resolve("prisma/build/index.js", {
  paths: [serverDir],
});
const result = spawnSync(process.execPath, [prismaEntry, ...args], {
  cwd: serverDir,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
