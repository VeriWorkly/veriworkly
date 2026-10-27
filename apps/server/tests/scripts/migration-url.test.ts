import { describe, expect, it } from "vitest";

import { isPoolerUrl, resolveMigrationUrl } from "../../scripts/migrationUrl.js";

/**
 * V-251: `prisma.config.ts` fell back to `DATABASE_URL` when `DIRECT_DATABASE_URL` was empty,
 * and `DATABASE_URL` is the Neon `-pooler` host, where the migrate advisory lock does not hold.
 * A migrate command now refuses a pooler URL; everything else (generate, from postinstall) still
 * loads without a database.
 */

const POOLER = "postgresql://u:p@ep-cool-1234-pooler.eu-central-1.aws.neon.tech/db?sslmode=require";
const DIRECT = "postgresql://u:p@ep-cool-1234.eu-central-1.aws.neon.tech/db?sslmode=require";

describe("migration URL (V-251)", () => {
  it("recognises the common pooler spellings", () => {
    expect(isPoolerUrl(POOLER)).toBe(true);
    expect(isPoolerUrl("postgresql://u:p@db.example.com:6543/db")).toBe(true);
    expect(isPoolerUrl("postgresql://u:p@db.example.com/db?pgbouncer=true")).toBe(true);
    expect(isPoolerUrl(DIRECT)).toBe(false);
    expect(isPoolerUrl("postgresql://veriworkly:veriworkly@localhost:5433/veriworkly_test")).toBe(
      false,
    );
  });

  it("prefers DIRECT_DATABASE_URL", () => {
    expect(
      resolveMigrationUrl({ DIRECT_DATABASE_URL: DIRECT, DATABASE_URL: POOLER }, [
        "migrate",
        "deploy",
      ]),
    ).toBe(DIRECT);
  });

  it("refuses to migrate through a pooler when DIRECT_DATABASE_URL is empty", () => {
    expect(() =>
      resolveMigrationUrl({ DIRECT_DATABASE_URL: "", DATABASE_URL: POOLER }, ["migrate", "deploy"]),
    ).toThrow(/DIRECT_DATABASE_URL/);
  });

  it("still falls back to a direct DATABASE_URL, and never throws outside migrate", () => {
    expect(resolveMigrationUrl({ DATABASE_URL: DIRECT }, ["migrate", "deploy"])).toBe(DIRECT);
    expect(resolveMigrationUrl({ DATABASE_URL: POOLER }, ["generate"])).toBe(POOLER);
    expect(resolveMigrationUrl({}, ["generate"])).toBeUndefined();
  });
});
