import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { prisma } from "#lib/prisma";

/**
 * Prisma cannot model partial, expression or trigram indexes, so those are written by hand in the
 * migrations, and `prisma migrate diff` (the `db:drift` guard) ignores them. Nothing else would
 * notice one going missing: a migration edited by mistake, a `CREATE INDEX IF NOT EXISTS` that
 * met a same-named index of a different shape, or an extension that failed to load. This file
 * reads every migration in order, works out which indexes should exist after the last one, and
 * checks the database `migrate deploy` produced.
 */

const MIGRATIONS = path.resolve(__dirname, "../../prisma/migrations");

type DeclaredIndex = {
  name: string;
  table: string;
  unique: boolean;
  partial: boolean;
  method: string;
  expression: boolean;
};

/**
 * Every statement that can change which indexes exist. The scanner finds each keyword in source
 * order and the matching pattern must parse it in full; a form none of them understands (an
 * unnamed or CONCURRENTLY index, a multi-name DROP, an ALTER INDEX that is not a rename) fails the
 * run with "unsupported statement" rather than reporting an index as missing or silently skipping
 * it.
 */
const KEYWORDS =
  /\b(?:CREATE\s+(?:UNIQUE\s+)?INDEX|DROP\s+INDEX|ALTER\s+INDEX|DROP\s+TABLE|ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?"[^"]+"\s+RENAME\s+TO)\b/gi;
const CREATE =
  /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"\s+ON\s+(?:ONLY\s+)?"([^"]+)"([^;]*);/iy;
const DROP_INDEX = /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s*(?:CASCADE\s*|RESTRICT\s*)?;/iy;
const RENAME_INDEX = /ALTER\s+INDEX\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+RENAME\s+TO\s+"([^"]+)"\s*;/iy;
const DROP_TABLE = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s*(?:CASCADE\s*|RESTRICT\s*)?;/iy;
const RENAME_TABLE =
  /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?"([^"]+)"\s+RENAME\s+TO\s+"([^"]+)"\s*;/iy;

type Migration = { name: string; sql: string };

function at(pattern: RegExp, sql: string, index: number): RegExpExecArray | null {
  pattern.lastIndex = index;
  return pattern.exec(sql);
}

/** The indexes that exist after applying `migrations` in order, statement by statement. */
function declaredIndexesFrom(migrations: Migration[]): Map<string, DeclaredIndex> {
  const live = new Map<string, DeclaredIndex>();

  for (const migration of migrations) {
    const sql = migration.sql.replace(/--[^\n]*/g, "");

    for (const keyword of sql.matchAll(KEYWORDS)) {
      const index = keyword.index!;
      let match: RegExpExecArray | null;

      if ((match = at(CREATE, sql, index))) {
        const [, unique, name, table, rest] = match as unknown as string[];
        const using = /^\s*USING\s+(\w+)/i.exec(rest!);
        const columns = rest!.slice(rest!.indexOf("(") + 1);
        live.set(name!, {
          name: name!,
          table: table!,
          unique: Boolean(unique),
          partial: /\bWHERE\b/i.test(rest!),
          method: (using?.[1] ?? "btree").toLowerCase(),
          expression: /^\s*\(/.test(columns),
        });
      } else if ((match = at(DROP_INDEX, sql, index))) {
        live.delete(match[1]!);
      } else if ((match = at(RENAME_INDEX, sql, index))) {
        const existing = live.get(match[1]!);
        live.delete(match[1]!);
        if (existing) live.set(match[2]!, { ...existing, name: match[2]! });
      } else if ((match = at(DROP_TABLE, sql, index))) {
        for (const [name, entry] of live) if (entry.table === match[1]) live.delete(name);
      } else if ((match = at(RENAME_TABLE, sql, index))) {
        for (const entry of live.values()) if (entry.table === match[1]) entry.table = match[2]!;
      } else {
        const statement = sql.slice(index, sql.indexOf(";", index) + 1 || undefined).trim();
        throw new Error(
          `${migration.name}: unsupported statement, update hand-written-indexes.test.ts to ` +
            `understand it: ${statement.slice(0, 160)}`,
        );
      }
    }
  }

  return live;
}

function declaredIndexes(): Map<string, DeclaredIndex> {
  const migrations = fs
    .readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => ({ name, file: path.join(MIGRATIONS, name, "migration.sql") }))
    .filter(({ file }) => fs.existsSync(file))
    .map(({ name, file }) => ({ name, sql: fs.readFileSync(file, "utf8") }));

  return declaredIndexesFrom(migrations);
}

const isHandWritten = (index: DeclaredIndex) =>
  index.partial || index.expression || index.method !== "btree";

type DatabaseIndex = { indexname: string; tablename: string; indexdef: string };

async function databaseIndexes(): Promise<Map<string, DatabaseIndex>> {
  const rows = await prisma.$queryRaw<DatabaseIndex[]>`
    SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname = 'public'
  `;
  return new Map(rows.map((row) => [row.indexname, row]));
}

describe("the migration reader", () => {
  const names = (sql: string) => [...declaredIndexesFrom([{ name: "fixture", sql }]).keys()];

  it("applies statements in source order, so a drop then re-create keeps the index", () => {
    expect(
      names(`
        CREATE INDEX "a_idx" ON "T"("x") WHERE "y" > 0;
        DROP INDEX "a_idx";
        CREATE INDEX "a_idx" ON "T"("x") WHERE "y" > 1;
        CREATE INDEX "b_idx" ON "T"("x");
        DROP INDEX IF EXISTS "b_idx";
      `),
    ).toEqual(["a_idx"]);
  });

  it("follows index renames, table renames and dropped tables", () => {
    const live = declaredIndexesFrom([
      {
        name: "fixture",
        sql: `
          CREATE UNIQUE INDEX "old_idx" ON "T"("x") WHERE "y" IS NULL;
          ALTER INDEX "old_idx" RENAME TO "new_idx";
          ALTER TABLE "T" RENAME TO "U";
          CREATE INDEX "gone_idx" ON "Gone" USING GIN ("name" gin_trgm_ops);
          DROP TABLE "Gone";
        `,
      },
    ]);

    expect([...live.keys()]).toEqual(["new_idx"]);
    expect(live.get("new_idx")).toMatchObject({ table: "U", unique: true, partial: true });
  });

  it.each([
    `CREATE INDEX CONCURRENTLY "c_idx" ON "T"("x");`,
    `CREATE INDEX ON "T"("x");`,
    `DROP INDEX "a_idx", "b_idx";`,
    `ALTER INDEX "a_idx" SET TABLESPACE fast;`,
  ])("refuses a statement it does not understand: %s", (sql) => {
    expect(() => names(sql)).toThrow(/unsupported statement, update hand-written-indexes/);
  });
});

describe("every index the migrations declare exists in the migrated database", () => {
  const declared = declaredIndexes();
  const handWritten = [...declared.values()].filter(isHandWritten);

  it("finds the hand-written indexes the audit named (so the parser above cannot pass empty)", () => {
    expect(handWritten.map((index) => index.name)).toEqual(
      expect.arrayContaining([
        // Trigram search on the admin user list (needs pg_trgm).
        "User_email_trgm_idx",
        "User_name_trgm_idx",
        "User_username_trgm_idx",
        // Partial indexes: credit sweeps, AI replay, one active withdrawal, one GitHub per user.
        "CreditGrant_sweep_idx",
        "CreditReservation_sweep_idx",
        "CreditReservation_replay_idx",
        "AffiliateWithdrawal_one_active_per_user",
        "Account_userId_github_key",
        // Account deletion lookups (expression indexes on JSON).
        "AdminAuditEntry_metadata_userId_idx",
        "AdminAuditEntry_metadata_ownerId_idx",
        "BillingWebhookEvent_payload_user_idx",
        "BillingWebhookEvent_payload_subscription_idx",
        // Retention backlogs (V-250).
        "BillingWebhookEvent_unredacted_idx",
        "Document_unpurged_deleted_idx",
        "ShareLink_unpurged_idx",
        "PortfolioPublication_unpurged_idx",
        "AdminAuditEntry_titled_idx",
      ]),
    );
  });

  it("has the pg_trgm extension the trigram indexes need", async () => {
    const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'
    `;
    expect(rows).toHaveLength(1);
  });

  it("has every declared index on its table", async () => {
    const actual = await databaseIndexes();
    const missing = [...declared.values()]
      .filter((index) => actual.get(index.name)?.tablename !== index.table)
      .map((index) => `${index.table}.${index.name}`);

    expect(missing).toEqual([]);
  });

  it("has each hand-written index in the shape its migration wrote", async () => {
    const actual = await databaseIndexes();
    const wrong = handWritten.flatMap((index) => {
      const def = actual.get(index.name)?.indexdef ?? "";
      const problems = [
        index.unique !== /^CREATE UNIQUE INDEX/.test(def) && "uniqueness",
        index.partial !== / WHERE /.test(def) && "predicate",
        !def.includes(` USING ${index.method} `) && `method ${index.method}`,
      ].filter(Boolean);
      return problems.length ? [`${index.name}: ${problems.join(", ")} (${def || "missing"})`] : [];
    });

    expect(wrong).toEqual([]);
  });
});
