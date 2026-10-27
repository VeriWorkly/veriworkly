import { describe, expect, it, vi } from "vitest";

import { applyServerEnv, BLANKED_CREDENTIALS, resolveIntegrationEnv } from "../integration/env.js";

const LOCAL_TEST_DB = "postgresql://u:p@localhost:5433/veriworkly_test";
const LOCAL_REDIS = "redis://localhost:6379/15";

describe("integration suite database guard (V-258)", () => {
  it("accepts a loopback database whose name ends in _test", () => {
    expect(
      resolveIntegrationEnv({
        INTEGRATION_DATABASE_URL: LOCAL_TEST_DB,
        INTEGRATION_REDIS_URL: LOCAL_REDIS,
      }).databaseUrl,
    ).toBe(LOCAL_TEST_DB);
  });

  it("refuses a local development database that does not end in _test", () => {
    expect(() =>
      resolveIntegrationEnv({
        INTEGRATION_DATABASE_URL: "postgresql://u:p@localhost:5433/veriworkly",
      }),
    ).toThrow(/_test/);
  });

  it("requires INTEGRATION_DATABASE_URL locally and never falls back to DATABASE_URL", () => {
    expect(() => resolveIntegrationEnv({ DATABASE_URL: LOCAL_TEST_DB })).toThrow(
      /INTEGRATION_DATABASE_URL/,
    );
    expect(() => resolveIntegrationEnv({ CI: "1", DATABASE_URL: LOCAL_TEST_DB })).toThrow(
      /INTEGRATION_DATABASE_URL/,
    );
    expect(() => resolveIntegrationEnv({})).toThrow(/INTEGRATION_DATABASE_URL/);
  });

  it("in CI accepts a loopback _test DATABASE_URL and nothing else", () => {
    expect(resolveIntegrationEnv({ CI: "true", DATABASE_URL: LOCAL_TEST_DB }).databaseUrl).toBe(
      LOCAL_TEST_DB,
    );
    expect(() =>
      resolveIntegrationEnv({ CI: "true", DATABASE_URL: "postgresql://u:p@db.example.com/x_test" }),
    ).toThrow(/non-local/);
    expect(() =>
      resolveIntegrationEnv({
        CI: "true",
        DATABASE_URL: "postgresql://u:p@localhost:5432/veriworkly",
      }),
    ).toThrow(/_test/);
  });

  it("refuses a ?host= parameter that points somewhere else", () => {
    expect(() =>
      resolveIntegrationEnv({
        INTEGRATION_DATABASE_URL:
          "postgresql://u:p@localhost:5432/veriworkly_test?host=prod.example.neon.tech",
      }),
    ).toThrow(/non-local database host/);
  });

  // V-364: node-postgres copies query parameters into the client config, so `?database=` (or
  // `dbname`, `user`, `port`) would connect somewhere the _test name in the path never named.
  it.each(["database=veriworkly", "dbname=veriworkly", "user=postgres", "port=5432", "DATABASE=x"])(
    "refuses a ?%s parameter that overrides the connection target",
    (query) => {
      expect(() =>
        resolveIntegrationEnv({
          INTEGRATION_DATABASE_URL: `postgresql://u:p@localhost:5433/veriworkly_test?${query}`,
          INTEGRATION_REDIS_URL: LOCAL_REDIS,
        }),
      ).toThrow(/query parameter/);
    },
  );

  it("still accepts harmless parameters such as sslmode", () => {
    expect(() =>
      resolveIntegrationEnv({
        INTEGRATION_DATABASE_URL: `${LOCAL_TEST_DB}?sslmode=disable`,
        INTEGRATION_REDIS_URL: LOCAL_REDIS,
      }),
    ).not.toThrow();
  });

  it("refuses a multi-host URL with any remote host", () => {
    expect(() =>
      resolveIntegrationEnv({
        INTEGRATION_DATABASE_URL: "postgresql://u:p@localhost:5432,db.example.com:5432/x_test",
      }),
    ).toThrow(/non-local database host|cannot parse/);
  });

  it("refuses a remote database even when named _test", () => {
    expect(() =>
      resolveIntegrationEnv({ INTEGRATION_DATABASE_URL: "postgresql://u:p@db.example.com/x_test" }),
    ).toThrow(/non-local/);
  });

  it("never takes Redis from the developer's REDIS_URL", () => {
    expect(
      resolveIntegrationEnv({
        INTEGRATION_DATABASE_URL: LOCAL_TEST_DB,
        REDIS_URL: "redis://localhost:6379/3",
      }).redisUrl,
    ).toBe(LOCAL_REDIS);
  });

  it("refuses Redis db 0 even with INTEGRATION_ALLOW_REMOTE", () => {
    expect(() =>
      resolveIntegrationEnv({
        INTEGRATION_DATABASE_URL: LOCAL_TEST_DB,
        INTEGRATION_REDIS_URL: "redis://localhost:6379/0",
        INTEGRATION_ALLOW_REMOTE: "1",
      }),
    ).toThrow(/db 0/);
  });
});

describe("integration suite environment isolation (V-257)", () => {
  it("blanks every third-party credential the shell carries", () => {
    const env: NodeJS.ProcessEnv = { INTEGRATION_DATABASE_URL: LOCAL_TEST_DB };
    for (const key of BLANKED_CREDENTIALS) env[key] = "live-value";

    applyServerEnv(env);

    for (const key of BLANKED_CREDENTIALS) expect(env[key], key).toBe("");
    for (const key of ["AI_API_KEY", "RESEND_API_KEY", "GITHUB_TOKEN", "GOOGLE_CLIENT_SECRET"])
      expect(BLANKED_CREDENTIALS).toContain(key);
  });

  it("config.ts does not load .env under Vitest", async () => {
    const dotenvConfig = vi.fn();
    vi.resetModules();
    vi.doMock("dotenv", () => ({ default: { config: dotenvConfig }, config: dotenvConfig }));

    await import("../../src/config.js");

    expect(dotenvConfig).not.toHaveBeenCalled();
    vi.doUnmock("dotenv");
  });
});
