import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

/**
 * Binds studio constants and payload builders to the server's own validators, so a value the
 * server refuses (or silently clamps) fails here instead of in production (S-177).
 *
 * The validators are imported from the server source. Their `#…` subpath imports point at the
 * server's build output, so each one a validator needs is mapped back to its source file.
 */

vi.mock("#utils/pagination", () => import("../../../server/src/utils/pagination"));
vi.mock(
  "#validators/admin/adminCommonValidator",
  () => import("../../../server/src/validators/admin/adminCommonValidator"),
);

const repoRoot = join(__dirname, "..", "..", "..", "..");

function readRepoFile(...segments: string[]) {
  return readFileSync(join(repoRoot, ...segments), "utf8").replace(/\r\n/g, "\n");
}

/** `ALLOWED_SCOPES` lives in a module that opens Prisma and Redis, so it is read from source. */
function serverAllowedScopes() {
  const source = readRepoFile("apps", "server", "src", "services", "apiKeyService.ts");
  const match = source.match(/export const ALLOWED_SCOPES = new Set\(\[([\s\S]*?)\]\)/);

  if (!match) throw new Error("ALLOWED_SCOPES not found in apiKeyService.ts");

  return [...match[1].matchAll(/"([^"]+)"/g)].map((scope) => scope[1]);
}

function docsSpecScopes() {
  const source = readRepoFile("apps", "docs-platform", "specs", "components", "schemas.yaml");
  const match = source.match(/^ApiKeyScope:\n[\s\S]*?  enum:\n((?:    - .+\n)+)/m);

  if (!match) throw new Error("ApiKeyScope enum not found in schemas.yaml");

  return match[1]
    .trim()
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim());
}

function serverApiKeyConfigDefault(name: "API_KEY_MAX_RATE_LIMIT" | "API_KEY_DEFAULT_RATE_LIMIT") {
  const source = readRepoFile("apps", "server", "src", "config.ts");
  const match = source.match(new RegExp(`process\\.env\\.${name},\\s*(\\d+)\\)`));

  if (!match) throw new Error(`${name} default not found in config.ts`);

  return Number(match[1]);
}

describe("S-081 S-177 API key scopes match the server", () => {
  it("S-081 the studio's scopes equal the server's ALLOWED_SCOPES and the docs spec enum", async () => {
    const { AVAILABLE_API_KEY_SCOPES } =
      await import("@/features/api-keys/components/ApiKeyScopes");

    const studio = [...AVAILABLE_API_KEY_SCOPES].sort();

    expect(studio).toEqual(serverAllowedScopes().sort());
    expect(studio).toEqual(docsSpecScopes().sort());
  });

  it("S-081 every scope is offered once in the picker and summarised by a group", async () => {
    const { API_KEY_SCOPE_GROUPS, API_KEY_SCOPE_OPTIONS, AVAILABLE_API_KEY_SCOPES } =
      await import("@/features/api-keys/components/ApiKeyScopes");

    const offered = API_KEY_SCOPE_OPTIONS.map((option) => option.value);
    const grouped = API_KEY_SCOPE_GROUPS.flatMap((group) => [...group.scopes]);

    expect([...offered].sort()).toEqual([...AVAILABLE_API_KEY_SCOPES].sort());
    expect([...grouped].sort()).toEqual([...AVAILABLE_API_KEY_SCOPES].sort());
  });
});

describe("S-082 S-177 API key rate limits match the server config", () => {
  it("S-082 the studio's maximum and default are the server's", async () => {
    const { API_KEY_DEFAULT_RATE_LIMIT, API_KEY_MAX_RATE_LIMIT } =
      await import("@/features/api-keys/api-key-service");

    expect(API_KEY_MAX_RATE_LIMIT).toBe(serverApiKeyConfigDefault("API_KEY_MAX_RATE_LIMIT"));
    expect(API_KEY_DEFAULT_RATE_LIMIT).toBe(
      serverApiKeyConfigDefault("API_KEY_DEFAULT_RATE_LIMIT"),
    );
  });

  it("S-083 the rate window the studio names is the limiter's 15 minutes", async () => {
    const { API_KEY_RATE_WINDOW_LABEL } = await import("@/features/api-keys/api-key-service");
    const limiter = readRepoFile("apps", "server", "src", "middleware", "apiKeyRateLimit.ts");

    expect(limiter).toMatch(/const WINDOW_MS = 15 \* 60 \* 1000;/);
    expect(API_KEY_RATE_WINDOW_LABEL).toBe("15 min");
  });
});

describe("S-177 studio payloads parse with the server's validators", () => {
  it("S-177 a create payload with every scope and a picked expiry passes apiKeyCreateSchema", async () => {
    const { apiKeyCreateSchema } = await import("../../../server/src/validators/apiKeyValidator");
    const { buildCreateApiKeyPayload } = await import("@/features/api-keys/api-key-service");
    const { AVAILABLE_API_KEY_SCOPES } =
      await import("@/features/api-keys/components/ApiKeyScopes");
    const { toLocalDateInput } = await import("@/lib/local-date");

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const payload = buildCreateApiKeyPayload({
      name: "  Docs integration ",
      scopes: [...AVAILABLE_API_KEY_SCOPES],
      rateLimit: 600,
      expiresAt: toLocalDateInput(tomorrow),
    });

    const parsed = apiKeyCreateSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    expect(payload.rateLimit).toBe(600);
  });

  it("S-177 a create payload without an expiry passes and leaves the default lifetime", async () => {
    const { apiKeyCreateSchema } = await import("../../../server/src/validators/apiKeyValidator");
    const { buildCreateApiKeyPayload } = await import("@/features/api-keys/api-key-service");

    const payload = buildCreateApiKeyPayload({
      name: "CI",
      scopes: ["user:read"],
      rateLimit: 20,
      expiresAt: "",
    });

    const parsed = apiKeyCreateSchema.parse(payload);

    expect(parsed.expiresAt).toBeUndefined();
  });

  it("S-177 an unchanged rotate payload passes apiKeyRotateSchema", async () => {
    const { apiKeyRotateSchema } = await import("../../../server/src/validators/apiKeyValidator");
    const { buildRotateApiKeyPayload } = await import("@/features/api-keys/api-key-service");
    const { toLocalDateInput } = await import("@/lib/local-date");

    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const payload = buildRotateApiKeyPayload(
      { name: "Docs", rateLimit: 300, expiresAt },
      { name: "Docs", rateLimit: 300, expiresAt: toLocalDateInput(new Date(expiresAt)) },
    );

    expect(apiKeyRotateSchema.safeParse(payload).success).toBe(true);
  });

  it("S-177 the roadmap create payload passes roadmapAdminCreateSchema", async () => {
    const { roadmapAdminCreateSchema } =
      await import("../../../server/src/validators/roadmapValidator");
    const { buildRoadmapPayload } = await import("@/app/admin/roadmap/components/roadmap-payload");

    const payload = buildRoadmapPayload(
      {
        title: "Changelog API",
        description: "Public changelog reads",
        status: "in-progress",
        eta: "",
        completedQuarter: "",
        tags: "api, docs",
        fullDescription: "",
        whyItMatters: "",
        timeline: "",
        startedAt: "2026-10-01",
        completedAt: "",
        detailsJson: "",
      },
      "create",
    );

    // The client adds the audit reason when it sends the payload (admin-roadmap.ts, V-081).
    expect(
      roadmapAdminCreateSchema.safeParse({ ...payload, reason: "Plan the changelog API" }).success,
    ).toBe(true);
  });

  it("S-177 the admin credit adjustment the forms send passes adminCreditAdjustmentSchema", async () => {
    const { adminCreditAdjustmentSchema } =
      await import("../../../server/src/validators/admin/adminBillingValidator");
    const { parseCreditAmount } = await import("@/app/admin/billing/credit-amount");

    const grant = parseCreditAmount("250");
    const clawBack = parseCreditAmount("-40");

    expect(grant).toEqual({ ok: true, amount: 250 });
    expect(clawBack).toEqual({ ok: true, amount: -40 });

    for (const result of [grant, clawBack]) {
      if (!result.ok) throw new Error(result.message);

      const parsed = adminCreditAdjustmentSchema.safeParse({
        userId: "user_1",
        amount: result.amount,
        reason: "Goodwill grant",
        idempotencyKey: "attempt-1",
      });

      expect(parsed.success).toBe(true);
    }
  });

  it("S-177 the credit forms refuse what the server refuses: fractions, zero and blanks", async () => {
    const { parseCreditAmount } = await import("@/app/admin/billing/credit-amount");

    for (const input of ["2.5", "0", "", "abc", "1e7"]) {
      const result = parseCreditAmount(input);

      expect(result.ok, input).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });
});
