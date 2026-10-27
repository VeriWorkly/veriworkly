import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * V-347: the compose `api` service is the only way its container gets settings (there is no
 * env_file), so every variable the server reads must be passed, or be listed below with the
 * reason it is left out. A variable passed but never read is dead config that misleads.
 */
const serverRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(serverRoot, "../..");

/** Read by the server but deliberately not passed to the compose `api` container. */
const NOT_PASSED: Record<string, string> = {
  VITEST: "test runner flag",
  SERVER_WORKERS: "old name of WEB_CONCURRENCY, which compose requires",
  AUDIT_LOG_RETENTION_DAYS: "old name of RETENTION_AUDIT_LOG_DAYS",
  NEXT_PUBLIC_APP_URL: "STUDIO_URL's fallback; compose passes STUDIO_URL",
  DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: "a startup parameter poolers refuse (see the compose comment)",
  DIRECT_DATABASE_URL: "migrations only; passed to the `migrate` service",
  SHADOW_DATABASE_URL: "`migrate dev` and the drift guard only",
  ALLOW_UNSIGNED_WEBHOOKS: "a development switch that production refuses",
};

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

/** Every variable name the server source reads from the environment. */
function variablesTheServerReads(): Set<string> {
  const names = new Set<string>();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]+)/g,
    /\benv\.([A-Z][A-Z0-9_]{3,})/g,
    // retentionJob's `days("RETENTION_…", default)`
    /\bdays\("([A-Z][A-Z0-9_]+)"/g,
  ];
  for (const file of walk(path.join(serverRoot, "src"))) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of patterns)
      for (const match of text.matchAll(pattern)) names.add(match[1]!);
  }
  return names;
}

/** The `api` service's `environment:` entries: name → raw value ("" for a bare key). */
function composeApiEnvironment(): Map<string, string> {
  const lines = fs.readFileSync(path.join(repoRoot, "compose.yaml"), "utf8").split(/\r?\n/);
  const start = lines.findIndex((line) => line === "  api:");
  const end = lines.findIndex((line, index) => index > start && /^ {2}[a-z]/.test(line));
  const env = new Map<string, string>();
  for (const line of lines.slice(start, end)) {
    const match = /^ {6}([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line);
    if (match) env.set(match[1]!, match[2]!.trim());
  }
  return env;
}

describe("compose api environment (V-347)", () => {
  const read = variablesTheServerReads();
  const passed = composeApiEnvironment();

  it("passes every variable the server reads, or says why it does not", () => {
    expect(passed.size).toBeGreaterThan(50);
    const missing = [...read].filter((name) => !passed.has(name) && !(name in NOT_PASSED)).sort();
    expect(missing).toEqual([]);
  });

  it("passes nothing the server never reads", () => {
    const dead = [...passed.keys()].filter((name) => !read.has(name)).sort();
    expect(dead).toEqual([]);
  });

  it("makes the variables every environment needs a compose error, not a crash loop", () => {
    expect(passed.get("ADMIN_EMAIL")).toMatch(/^\$\{ADMIN_EMAIL:\?/);
  });

  it("passes OAuth and the program flags, so sign-in and the programs work under compose", () => {
    for (const name of [
      "GOOGLE_CLIENT_ID",
      "GITHUB_CLIENT_ID",
      "LINKEDIN_CLIENT_ID",
      "AFFILIATE_PROGRAM_ENABLED",
      "AMBASSADOR_PROGRAM_ENABLED",
      "SITE_REVALIDATE_SECRET",
      "CRON_ROLE",
    ])
      expect(passed.has(name), name).toBe(true);
  });
});
