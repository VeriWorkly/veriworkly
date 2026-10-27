import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { describe, expect, it } from "vitest";

// Imported from the schema module rather than `#config/validateRuntimeConfig` on purpose: that
// module pulls in `#config`, whose `dotenv.config()` would copy the developer's local `.env` into
// this worker's `process.env`. Everything here works on env objects passed in explicitly.
import { validateEnvironmentConfig } from "../../src/config/environmentSchema.js";

type Env = Record<string, string | undefined>;

const exampleEnv: Env = dotenv.parse(
  fs.readFileSync(path.resolve(__dirname, "../../.env.example"), "utf8"),
);

const validProductionEnv: Env = Object.freeze({
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://veriworkly:secret@db.internal:5432/veriworkly",
  REDIS_URL: "redis://:a-long-redis-password@redis:6379",
  AUTH_SECRET: "k3v9Qx7LmN2pR8sT4wY6zA1bC5dE0fGh",
  API_KEY_HASH_SECRET: "a-different-api-key-hash-secret-0123456789",
  ANALYTICS_HASH_PEPPER: "a-real-analytics-pepper-value",
  PORTFOLIO_REVALIDATE_SECRET: "a-real-revalidate-secret",
  AUTH_BASE_URL: "https://api.veriworkly.com",
  ALLOWED_ORIGINS: "https://veriworkly.com,https://app.veriworkly.com",
  STUDIO_URL: "https://app.veriworkly.com",
  SITE_URL: "https://veriworkly.com",
  PORTFOLIO_URL: "https://veriworkly.me",
  DODO_PAYMENTS_CHECKOUT_RETURN_URL: "https://app.veriworkly.com/billing?checkout=complete",
  DODO_PAYMENTS_CHECKOUT_CANCEL_URL: "https://app.veriworkly.com/billing?checkout=cancelled",
  DODO_PAYMENTS_PORTAL_RETURN_URL: "https://app.veriworkly.com/billing",
  TRUST_PROXY: "1",
  WEB_CONCURRENCY: "2",
  RATE_LIMIT_MAX_REQUESTS: "100",
  ADMIN_EMAIL: "ops@veriworkly.com",
}) as Env;

/** The smallest environment that boots outside production: ADMIN_EMAIL is required everywhere. */
const devEnv = Object.freeze({ NODE_ENV: "development", ADMIN_EMAIL: "admin@example.com" }) as Env;

function messageFor(env: Env): string {
  try {
    validateEnvironmentConfig(env);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected validateEnvironmentConfig to throw");
}

function failingVariables(env: Env): string[] {
  return messageFor(env)
    .split("\n")
    .map((line) => /^\s*- ([A-Z0-9_]+):/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name));
}

describe("validateEnvironmentConfig", () => {
  it("does not read or write process.env when an env object is passed", () => {
    const before = JSON.stringify(process.env);
    expect(() => validateEnvironmentConfig(devEnv)).not.toThrow();
    expect(JSON.stringify(process.env)).toBe(before);
  });

  describe("production", () => {
    it("refuses the .env.example values and names every failing variable in one error", () => {
      // .env.example used to ship TRUST_PROXY=true; it now ships 1, which production accepts.
      // Pin the old value too so the rule that refuses it is covered by this end-to-end case.
      const names = failingVariables({
        ...exampleEnv,
        NODE_ENV: "production",
        TRUST_PROXY: "true",
      });

      expect(exampleEnv.TRUST_PROXY).toBe("1");
      expect(failingVariables({ ...exampleEnv, NODE_ENV: "production" })).not.toContain(
        "TRUST_PROXY",
      );
      expect(names).toEqual(
        expect.arrayContaining([
          "TRUST_PROXY",
          "API_KEY_HASH_SECRET",
          "ALLOWED_ORIGINS",
          "DODO_PAYMENTS_CHECKOUT_RETURN_URL",
          "DODO_PAYMENTS_CHECKOUT_CANCEL_URL",
          "DODO_PAYMENTS_PORTAL_RETURN_URL",
          "PORTFOLIO_URL",
          "STUDIO_URL",
          "AUTH_BASE_URL",
          "AUTH_SECRET",
          "ANALYTICS_HASH_PEPPER",
          "PORTFOLIO_REVALIDATE_SECRET",
          "DATABASE_URL",
        ]),
      );
    });

    it.each(["redis://localhost:6379", "redis://:pw@127.0.0.1:6379", "redis://:pw@redis:6379"])(
      "accepts REDIS_URL=%s (a local Redis on one server is fine)",
      (value) => {
        expect(() =>
          validateEnvironmentConfig({ ...validProductionEnv, REDIS_URL: value }),
        ).not.toThrow();
      },
    );

    it("accepts a complete production environment", () => {
      expect(() => validateEnvironmentConfig(validProductionEnv)).not.toThrow();
    });

    it("refuses an empty production environment instead of falling back to localhost defaults", () => {
      const names = failingVariables({ NODE_ENV: "production" });

      expect(names).toEqual(
        expect.arrayContaining([
          "TRUST_PROXY",
          "WEB_CONCURRENCY",
          "DATABASE_URL",
          "REDIS_URL",
          "AUTH_SECRET",
          "API_KEY_HASH_SECRET",
          "ANALYTICS_HASH_PEPPER",
          "PORTFOLIO_REVALIDATE_SECRET",
          "ALLOWED_ORIGINS",
          "AUTH_BASE_URL",
          "PORTFOLIO_URL",
          "DODO_PAYMENTS_CHECKOUT_RETURN_URL",
          "DODO_PAYMENTS_CHECKOUT_CANCEL_URL",
          "DODO_PAYMENTS_PORTAL_RETURN_URL",
          "ADMIN_EMAIL",
        ]),
      );
    });

    it("treats empty strings (compose's `${VAR}` with VAR unset) as unset", () => {
      expect(failingVariables({ ...validProductionEnv, ALLOWED_ORIGINS: "" })).toEqual([
        "ALLOWED_ORIGINS",
      ]);
    });

    it.each([
      ["true", false],
      ["false", false],
      ["yes", false],
      ["0", false],
      ["-1", false],
      ["not-a-cidr", false],
      ["10.0.0.0/33", false],
      ["1", true],
      ["2", true],
      ["10.0.0.0/8,loopback", true],
      ["10.0.0.0/8, 172.16.0.0/12, loopback", true],
      ["127.0.0.1", true],
      ["fd00::/8,uniquelocal,linklocal", true],
    ])("TRUST_PROXY=%s accepted=%s", (value, accepted) => {
      const env = { ...validProductionEnv, TRUST_PROXY: value };
      if (accepted) {
        expect(() => validateEnvironmentConfig(env)).not.toThrow();
      } else {
        expect(failingVariables(env)).toContain("TRUST_PROXY");
      }
    });

    it("accepts TRUST_PROXY=0 only together with DIRECT_EXPOSURE=1", () => {
      expect(failingVariables({ ...validProductionEnv, TRUST_PROXY: "0" })).toContain(
        "TRUST_PROXY",
      );
      expect(() =>
        validateEnvironmentConfig({
          ...validProductionEnv,
          TRUST_PROXY: "0",
          DIRECT_EXPOSURE: "1",
        }),
      ).not.toThrow();
      expect(
        failingVariables({ ...validProductionEnv, TRUST_PROXY: "1", DIRECT_EXPOSURE: "1" }),
      ).toContain("DIRECT_EXPOSURE");
    });

    it("refuses TRUST_PROXY when it is unset", () => {
      expect(failingVariables({ ...validProductionEnv, TRUST_PROXY: undefined })).toEqual([
        "TRUST_PROXY",
      ]);
    });

    it.each(["0", "-2", "two", "1.5"])("refuses WEB_CONCURRENCY=%s", (value) => {
      expect(failingVariables({ ...validProductionEnv, WEB_CONCURRENCY: value })).toEqual([
        "WEB_CONCURRENCY",
      ]);
    });

    it.each([
      ["ALLOWED_ORIGINS", "https://veriworkly.com,http://localhost:3001"],
      ["ALLOWED_ORIGINS", "https://veriworkly.com,http://veriworkly.com"],
      ["ALLOWED_ORIGINS", "https://veriworkly.com,https://127.0.0.1"],
      ["ALLOWED_ORIGINS", "https://veriworkly.com,not a url"],
      ["DODO_PAYMENTS_CHECKOUT_RETURN_URL", "http://localhost:3001/billing?checkout=complete"],
      ["DODO_PAYMENTS_CHECKOUT_CANCEL_URL", "http://app.veriworkly.com/billing"],
      ["DODO_PAYMENTS_PORTAL_RETURN_URL", "https://localhost/billing"],
      ["PORTFOLIO_URL", "http://localhost:3004"],
      ["STUDIO_URL", "http://localhost:3001"],
      ["SITE_URL", "http://veriworkly.com"],
      ["AUTH_BASE_URL", "http://localhost:8080"],
      ["REDIS_URL", "http://redis:6379"],
      // Localhost spellings that slip past a plain string match.
      ["AUTH_BASE_URL", "https://[::ffff:127.0.0.1]"],
      ["AUTH_BASE_URL", "https://[::ffff:7f00:1]"],
      ["AUTH_BASE_URL", "https://localhost."],
      ["AUTH_BASE_URL", "https://foo.localhost."],
      ["AUTH_BASE_URL", "https://0177.0.0.1"],
      ["AUTH_BASE_URL", "https://0x7f.1"],
      ["AUTH_BASE_URL", "https://2130706433"],
      ["ALLOWED_ORIGINS", "https://veriworkly.com,https://[::ffff:127.0.0.1]"],
      ["ALLOWED_ORIGINS", "https://veriworkly.com,https://localhost."],
      ["API_KEY_HASH_SECRET", "dev-api-key-secret"],
      ["API_KEY_HASH_SECRET", validProductionEnv.AUTH_SECRET],
      ["AUTH_SECRET", "dev-auth-secret-1234567890"],
      ["AUTH_SECRET", "dev-auth-secret"],
      ["AUTH_SECRET", "too-short-but-not-an-example"],
      ["ANALYTICS_HASH_PEPPER", "veriworkly-analytics-pepper"],
      ["PORTFOLIO_REVALIDATE_SECRET", "dev-revalidate-secret"],
    ])("refuses %s=%s", (name, value) => {
      expect(failingVariables({ ...validProductionEnv, [name]: value })).toEqual([name]);
    });

    it("leaves optional URLs alone when unset (the code defaults are production-safe)", () => {
      expect(() =>
        validateEnvironmentConfig({
          ...validProductionEnv,
          STUDIO_URL: undefined,
          SITE_URL: undefined,
        }),
      ).not.toThrow();
    });

    it("holds NEXT_PUBLIC_APP_URL, STUDIO_URL's fallback, to the public https rule (V-097)", () => {
      expect(
        failingVariables({ ...validProductionEnv, NEXT_PUBLIC_APP_URL: "http://localhost:3001" }),
      ).toEqual(["NEXT_PUBLIC_APP_URL"]);
    });

    it("refuses an ALLOWED_ORIGINS entry that is not a bare origin", () => {
      expect(
        messageFor({
          ...validProductionEnv,
          ALLOWED_ORIGINS: "https://veriworkly.com/,https://app.veriworkly.com",
        }),
      ).toMatch(/"https:\/\/veriworkly.com\/" must be a bare origin/);
    });

    it("refuses an AUTH_COOKIE_DOMAIN that is a URL, and accepts a host name", () => {
      expect(
        failingVariables({ ...validProductionEnv, AUTH_COOKIE_DOMAIN: "https://veriworkly.com" }),
      ).toEqual(["AUTH_COOKIE_DOMAIN"]);
      expect(() =>
        validateEnvironmentConfig({ ...validProductionEnv, AUTH_COOKIE_DOMAIN: ".veriworkly.com" }),
      ).not.toThrow();
    });

    it("bounds AI_TIMEOUT_MS and ATS_EXTRACT_MAX_RSS_MB", () => {
      expect(
        failingVariables({
          ...validProductionEnv,
          AI_TIMEOUT_MS: "600000",
          ATS_EXTRACT_MAX_RSS_MB: "1",
        }).sort(),
      ).toEqual(["AI_TIMEOUT_MS", "ATS_EXTRACT_MAX_RSS_MB"]);
    });

    it("accepts the internal keys unset and refuses them shorter than 32 characters (V-151)", () => {
      expect(() => validateEnvironmentConfig(validProductionEnv)).not.toThrow();
      expect(() =>
        validateEnvironmentConfig({
          ...validProductionEnv,
          STATS_INTERNAL_KEY: "s".repeat(32),
          INTERNAL_API_KEY: "i".repeat(32),
        }),
      ).not.toThrow();
      expect(
        failingVariables({
          ...validProductionEnv,
          STATS_INTERNAL_KEY: "short",
          INTERNAL_API_KEY: "also-short",
        }),
      ).toEqual(expect.arrayContaining(["STATS_INTERNAL_KEY", "INTERNAL_API_KEY"]));
    });

    it("refuses STATS_INTERNAL_KEY equal to INTERNAL_API_KEY", () => {
      const shared = "k".repeat(40);
      expect(
        failingVariables({
          ...validProductionEnv,
          STATS_INTERNAL_KEY: shared,
          INTERNAL_API_KEY: shared,
        }),
      ).toContain("STATS_INTERNAL_KEY");
    });

    it("refuses x-forwarded-client-ip in AUTH_IP_ADDRESS_HEADERS in any environment", () => {
      expect(
        failingVariables({
          ...validProductionEnv,
          AUTH_IP_ADDRESS_HEADERS: "x-client-ip, X-Forwarded-Client-IP",
        }),
      ).toContain("AUTH_IP_ADDRESS_HEADERS");
      expect(
        failingVariables({
          ...devEnv,
          AUTH_IP_ADDRESS_HEADERS: "x-forwarded-client-ip",
        }),
      ).toEqual(["AUTH_IP_ADDRESS_HEADERS"]);
    });

    it("never echoes secret values back in the error message", () => {
      const message = messageFor({
        ...validProductionEnv,
        AUTH_SECRET: "short-secret-value",
        API_KEY_HASH_SECRET: "short-secret-value",
      });
      expect(message).not.toContain("short-secret-value");
    });
  });

  describe("every environment", () => {
    it("refuses RATE_LIMIT_MAX_REQUESTS=abc in development (it would silently disable the limiter)", () => {
      expect(failingVariables({ ...devEnv, RATE_LIMIT_MAX_REQUESTS: "abc" })).toEqual([
        "RATE_LIMIT_MAX_REQUESTS",
      ]);
    });

    it("refuses MAX_MEMORY_ENTRIES=abc (it would make the fallback map unbounded)", () => {
      expect(failingVariables({ ...devEnv, NODE_ENV: "test", MAX_MEMORY_ENTRIES: "abc" })).toEqual([
        "MAX_MEMORY_ENTRIES",
      ]);
    });

    it.each(["12abc", "1.5", "1e3", "Infinity", "NaN", "70000"])("refuses PORT=%s", (value) => {
      expect(failingVariables({ ...devEnv, PORT: value })).toEqual(["PORT"]);
    });

    it("refuses an integer too large to represent exactly (parseIntegerEnv would default it)", () => {
      expect(
        failingVariables({
          ...devEnv,
          RATE_LIMIT_MAX_REQUESTS: "12345678901234567890",
        }),
      ).toEqual(["RATE_LIMIT_MAX_REQUESTS"]);
      expect(failingVariables({ ...devEnv, RATE_LIMIT_MAX_REQUESTS: "9007199254740992" })).toEqual([
        "RATE_LIMIT_MAX_REQUESTS",
      ]);
      expect(() =>
        validateEnvironmentConfig({
          ...devEnv,
          RATE_LIMIT_MAX_REQUESTS: "9007199254740991",
        }),
      ).not.toThrow();
    });

    it("reads a blank integer as unset, as parseIntegerEnv does, so a blank compose pass-through boots (V-347)", () => {
      expect(() =>
        validateEnvironmentConfig({
          ...validProductionEnv,
          MAX_MEMORY_ENTRIES: "",
          RETENTION_AUDIT_LOG_DAYS: " ",
          DB_POOL_MAX: "",
        }),
      ).not.toThrow();
    });

    it("still requires a blank WEB_CONCURRENCY in production, since blank would silently default", () => {
      expect(failingVariables({ ...validProductionEnv, WEB_CONCURRENCY: "" })).toEqual([
        "WEB_CONCURRENCY",
      ]);
    });

    it("lists every bad numeric variable, not just the first", () => {
      expect(
        failingVariables({
          ...devEnv,
          RATE_LIMIT_MAX_REQUESTS: "abc",
          AUTH_OTP_TTL_SECONDS: "five",
          DB_POOL_MAX_TOTAL: "lots",
        }).sort(),
      ).toEqual(["AUTH_OTP_TTL_SECONDS", "DB_POOL_MAX_TOTAL", "RATE_LIMIT_MAX_REQUESTS"]);
    });

    it("refuses RATE_LIMIT_MAX_REQUESTS=0 (every request would be rejected)", () => {
      expect(failingVariables({ ...devEnv, RATE_LIMIT_MAX_REQUESTS: "0" })).toEqual([
        "RATE_LIMIT_MAX_REQUESTS",
      ]);
    });

    it("refuses an unknown NODE_ENV", () => {
      expect(failingVariables({ ...devEnv, NODE_ENV: "prod" })).toEqual(["NODE_ENV"]);
    });

    it("reports NODE_ENV, numeric and production problems together", () => {
      expect(failingVariables({ ...devEnv, NODE_ENV: "staging", PORT: "http" }).sort()).toEqual([
        "NODE_ENV",
        "PORT",
      ]);
      const names = failingVariables({ ...validProductionEnv, PORT: "http", TRUST_PROXY: "true" });
      expect(names.sort()).toEqual(["PORT", "TRUST_PROXY"]);
    });

    it("refuses 0 for the TTLs that become Redis expiries or the session refresh age, in every environment", () => {
      // Formerly checked again by validateAuthRuntimeConfig; the schema is now the only check.
      expect(
        failingVariables({
          ...devEnv,
          AUTH_SESSION_RESET_TTL_ON_USE: "0",
          API_KEY_AUTH_CACHE_TTL_SECONDS: "0",
          API_KEY_LAST_USED_TOUCH_INTERVAL_SECONDS: "0",
        }).sort(),
      ).toEqual([
        "API_KEY_AUTH_CACHE_TTL_SECONDS",
        "API_KEY_LAST_USED_TOUCH_INTERVAL_SECONDS",
        "AUTH_SESSION_RESET_TTL_ON_USE",
      ]);
    });

    it.each(["development", "test", "production"])(
      "refuses a missing or blank ADMIN_EMAIL in %s",
      (nodeEnv) => {
        const base = nodeEnv === "production" ? validProductionEnv : devEnv;
        for (const value of [undefined, "", "   "]) {
          expect(failingVariables({ ...base, NODE_ENV: nodeEnv, ADMIN_EMAIL: value })).toEqual([
            "ADMIN_EMAIL",
          ]);
        }
      },
    );

    it.each([
      "admin",
      "admin@localhost",
      "a@example.com,b@example.com",
      "Admin <admin@example.com>",
      "ad min@example.com",
    ])("refuses ADMIN_EMAIL=%s (one plain address only)", (value) => {
      expect(failingVariables({ ...devEnv, ADMIN_EMAIL: value })).toEqual(["ADMIN_EMAIL"]);
    });

    it("accepts ADMIN_EMAIL with surrounding spaces or capitals (the config trims and lowercases)", () => {
      expect(() =>
        validateEnvironmentConfig({ ...devEnv, ADMIN_EMAIL: "  Ops@VeriWorkly.com " }),
      ).not.toThrow();
    });

    it.each(["0", "-5", "thirty", "1.5", "366"])(
      "refuses AFFILIATE_ATTRIBUTION_DAYS=%s",
      (value) => {
        expect(failingVariables({ ...devEnv, AFFILIATE_ATTRIBUTION_DAYS: value })).toEqual([
          "AFFILIATE_ATTRIBUTION_DAYS",
        ]);
      },
    );

    it("accepts AFFILIATE_ATTRIBUTION_DAYS unset or a whole number of days up to a year", () => {
      expect(() => validateEnvironmentConfig(devEnv)).not.toThrow();
      expect(() =>
        validateEnvironmentConfig({ ...devEnv, AFFILIATE_ATTRIBUTION_DAYS: "365" }),
      ).not.toThrow();
    });

    it("accepts the .env.example values in development", () => {
      expect(() =>
        validateEnvironmentConfig({ ...exampleEnv, NODE_ENV: "development" }),
      ).not.toThrow();
    });

    it("does not apply the production rules outside production", () => {
      expect(() => validateEnvironmentConfig({ ...devEnv, TRUST_PROXY: "true" })).not.toThrow();
      expect(() => validateEnvironmentConfig({ ADMIN_EMAIL: devEnv.ADMIN_EMAIL })).not.toThrow();
    });
  });
});
