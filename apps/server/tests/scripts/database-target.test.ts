import { describe, expect, it, vi } from "vitest";

vi.mock("#lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("#lib/redis", () => ({ initRedis: vi.fn() }));

import { assertLocalDatabase, isLocalDatabaseUrl } from "../../src/lib/databaseTarget.js";
import { assertSeedAllowed } from "../../scripts/seedSupport.js";

const NEON = "postgresql://u:p@ep-cool-name.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const LOCAL = "postgresql://veriworkly:veriworkly@localhost:5433/veriworkly";

describe("isLocalDatabaseUrl (V-209)", () => {
  it.each([
    [LOCAL, true],
    ["postgresql://u@127.0.0.1/db", true],
    ["postgresql://u@[::1]:5432/db", true],
    ["postgresql://u@/db?host=/var/run/postgresql", true],
    [NEON, false],
    ["postgresql://u@localhost/db?host=db.example.com", false],
    ["postgresql://u@localhost:5432,db.example.com:5432/db", false],
    ["not a url", false],
  ])("%s → %s", (url, expected) => {
    expect(isLocalDatabaseUrl(url)).toBe(expected);
  });
});

describe("assertLocalDatabase (V-209)", () => {
  it("refuses a remote URL without --allow-production and hides the password", () => {
    expect(() => assertLocalDatabase("db:migrate", { DATABASE_URL: NEON }, [])).toThrow(
      /refusing a non-local database \(DATABASE_URL=postgresql:\/\/u:\*\*\*@/,
    );
  });

  it("checks every URL, not only DATABASE_URL", () => {
    expect(() =>
      assertLocalDatabase("db:drift", { DATABASE_URL: LOCAL, SHADOW_DATABASE_URL: NEON }, []),
    ).toThrow(/SHADOW_DATABASE_URL/);
  });

  it("allows a remote URL with --allow-production, and local ones always", () => {
    expect(assertLocalDatabase("x", { DATABASE_URL: NEON }, ["--allow-production"])).toEqual({
      allowedProduction: true,
    });
    expect(() =>
      assertLocalDatabase("x", { DATABASE_URL: LOCAL, DIRECT_DATABASE_URL: "" }, []),
    ).not.toThrow();
  });
});

describe("assertSeedAllowed (V-209)", () => {
  it("refuses the live database under NODE_ENV=development", () => {
    expect(() =>
      assertSeedAllowed("seed:roadmap", { NODE_ENV: "development", DATABASE_URL: NEON }, []),
    ).toThrow(/non-local database/);
  });

  it("refuses --wipe on a remote database even with --allow-production", () => {
    expect(() =>
      assertSeedAllowed("seed:roadmap", { NODE_ENV: "development", DATABASE_URL: NEON }, [
        "--wipe",
        "--allow-production",
      ]),
    ).toThrow(/--wipe is refused/);
  });

  it("refuses a remote DIRECT_DATABASE_URL behind a local DATABASE_URL", () => {
    expect(() =>
      assertSeedAllowed(
        "seed:changelog",
        { NODE_ENV: "development", DATABASE_URL: LOCAL, DIRECT_DATABASE_URL: NEON },
        [],
      ),
    ).toThrow(/DIRECT_DATABASE_URL/);
  });

  it("allows a local database, with --wipe", () => {
    expect(() =>
      assertSeedAllowed("seed:roadmap", { NODE_ENV: "development", DATABASE_URL: LOCAL }, [
        "--wipe",
      ]),
    ).not.toThrow();
  });

  it("still needs --allow-production under NODE_ENV=production", () => {
    expect(() =>
      assertSeedAllowed("seed:roadmap", { NODE_ENV: "production", DATABASE_URL: NEON }, []),
    ).toThrow(/NODE_ENV=production/);
    expect(() =>
      assertSeedAllowed("seed:roadmap", { NODE_ENV: "production", DATABASE_URL: NEON }, [
        "--allow-production",
      ]),
    ).not.toThrow();
  });
});

describe("manual sync commands refuse a remote database (V-209)", () => {
  const initRedis = vi.fn();

  async function runEntry(entry: string, env: Record<string, string>) {
    vi.resetModules();
    vi.doMock("#config", () => ({ config: { github: { syncEnabled: true } } }));
    vi.doMock("#lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
    vi.doMock("#lib/prisma", () => ({ prisma: { $queryRaw: vi.fn(), $disconnect: vi.fn() } }));
    vi.doMock("#lib/redis", () => ({ initRedis, closeRedis: vi.fn() }));
    vi.doMock("#services/github/index", () => ({ syncGitHubStatsFromGitHub: vi.fn() }));
    vi.doMock("#services/changelog/index", () => ({ syncChangelogFromGitHubReleases: vi.fn() }));
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    const previous = process.exitCode;
    try {
      await import(entry);
      await vi.waitFor(() => expect(process.exitCode).toBe(1));
    } finally {
      process.exitCode = previous;
      exit.mockRestore();
      vi.unstubAllEnvs();
    }
  }

  it.each(["../../src/jobs/runGithubSyncOnce.js", "../../scripts/sync-changelog-releases.js"])(
    "%s stops before touching Redis or the database",
    async (entry) => {
      initRedis.mockClear();
      await runEntry(entry, { DATABASE_URL: NEON, DIRECT_DATABASE_URL: "" });
      expect(initRedis).not.toHaveBeenCalled();
    },
  );
});
