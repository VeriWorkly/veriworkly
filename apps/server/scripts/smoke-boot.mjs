#!/usr/bin/env node
/**
 * Smoke-boots the built server the way production runs it (plain `node dist/index.js` under
 * NODE_ENV=production, clustered, as pm2 starts it), then checks the liveness and readiness
 * probes and stops it with SIGTERM (V-161).
 *
 *   npm run build -w @veriworkly/server
 *   DATABASE_URL=postgresql://… REDIS_URL=redis://… node apps/server/scripts/smoke-boot.mjs
 *
 * DATABASE_URL must point at a migrated database (the boot creates the admin user) and REDIS_URL
 * at a Redis it may write to; both are required, and nothing else is. Every other variable gets
 * a value below that passes the production config checks without reaching a real service. The
 * child gets only those, the two URLs and the few OS variables a process needs to start: nothing
 * else from the calling shell (a developer's real keys, a CI job's secrets) reaches the boot.
 * SMOKE_PORT moves the port. Never point this at production.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(serverDir, "dist", "index.js");

const BOOT_TIMEOUT_MS = Number(process.env.SMOKE_BOOT_TIMEOUT_MS ?? 90_000);
const STOP_TIMEOUT_MS = 45_000;

for (const variable of ["DATABASE_URL", "REDIS_URL"]) {
  if (!process.env[variable]) {
    console.error(`smoke-boot: ${variable} is required (a disposable database / Redis).`);
    process.exit(2);
  }
}

if (!existsSync(entry)) {
  console.error(`smoke-boot: ${entry} not found; run \`npm run build -w @veriworkly/server\`.`);
  process.exit(2);
}

// The boot creates the admin user and runs the jobs' first ticks: never against a remote database
// unless asked for (V-209). The child gets only DATABASE_URL, so that is the one URL to check.
const { assertLocalDatabase } = await import(
  pathToFileURL(path.join(serverDir, "dist", "lib", "databaseTarget.js")).href
);
try {
  assertLocalDatabase("smoke-boot", { DATABASE_URL: process.env.DATABASE_URL });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

/** 48 characters, so every secret clears the length checks; distinct per variable. */
const secret = (name) => `smoke-${name}-`.padEnd(48, "x");

/**
 * The AI and ATS policies are private operator files in production. Placeholders that pass the
 * same schemas stand in for them: the boot validates them, and nothing here calls a model.
 */
const { AI_ACTION_KEYS } = await import(
  pathToFileURL(path.join(serverDir, "dist", "services", "aiTypes.js")).href
);
const { DEFAULT_POLICY } = await import("@veriworkly/ats-engine");

const smokeMode = { credits: 1, model: "smoke-model", maxOutputTokens: 256 };
const AI_ACTIONS_POLICY = Object.fromEntries(
  AI_ACTION_KEYS.map((action) => [
    action,
    {
      maxTextChars: 1000,
      maxContextChars: 1000,
      maxJobDescriptionChars: 1000,
      systemPrompt: "smoke",
      userPromptTemplate: "smoke",
      standard: smokeMode,
      expert: smokeMode,
    },
  ]),
);
const ATS_AI_POLICY = {
  prompts: { standardAnalysis: "smoke", onlineAnalysis: "smoke", resumeConversion: "smoke" },
  pricing: { creditRevenueUsd: 1, analysisBuckets: [5], onlineMultiplier: 2 },
  models: [
    {
      model: "smoke-model",
      tiers: ["standard", "detailed", "advanced", "expert"],
      inputUsdPerMillion: 0,
      outputUsdPerMillion: 0,
      maxOutputTokens: 256,
      retries: 0,
      feeMultiplier: 1,
    },
  ],
  resumeConversion: { credits: 1, model: "smoke-model", maxOutputTokens: 256 },
  parseRepair: { credits: 1, model: "smoke-model", maxOutputTokens: 256 },
};

const SMOKE_ENV = {
  NODE_ENV: "production",
  PORT: process.env.SMOKE_PORT || "18080",
  TRUST_PROXY: "1",
  CLUSTERING_ENABLED: "true",
  WEB_CONCURRENCY: "2",
  // No background jobs: a startup GitHub or changelog sync would reach the network.
  CRON_ROLE: "none",
  LOG_LEVEL: "warn",
  ALLOWED_ORIGINS: "https://studio.smoke.example.com",
  SITE_URL: "https://smoke.example.com",
  AUTH_BASE_URL: "https://api.smoke.example.com",
  STUDIO_URL: "https://studio.smoke.example.com",
  STUDIO_LOGIN_URL: "https://studio.smoke.example.com/login",
  PORTFOLIO_URL: "https://portfolio.smoke.example.com",
  DODO_PAYMENTS_CHECKOUT_RETURN_URL: "https://studio.smoke.example.com/billing",
  DODO_PAYMENTS_CHECKOUT_CANCEL_URL: "https://studio.smoke.example.com/billing",
  DODO_PAYMENTS_PORTAL_RETURN_URL: "https://studio.smoke.example.com/billing",
  AUTH_SECRET: secret("auth"),
  API_KEY_HASH_SECRET: secret("api-key-hash"),
  ANALYTICS_HASH_PEPPER: secret("analytics-pepper"),
  PORTFOLIO_REVALIDATE_SECRET: secret("revalidate"),
  INTERNAL_API_KEY: secret("internal"),
  STATS_INTERNAL_KEY: secret("stats"),
  ADMIN_EMAIL: "admin@smoke.example.com",
  AUTH_EMAIL_FROM: "VeriWorkly <no-reply@smoke.example.com>",
  AUTH_EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: secret("resend"),
  AI_API_KEY: secret("ai"),
  AI_BASE_URL: "https://ai.smoke.example.com/v1",
  AI_ACTIONS_POLICY_JSON: JSON.stringify(AI_ACTIONS_POLICY),
  ATS_AI_POLICY_JSON: JSON.stringify(ATS_AI_POLICY),
  ATS_ENGINE_POLICY_JSON: JSON.stringify(DEFAULT_POLICY),
  DODO_PAYMENTS_API_KEY: secret("dodo"),
  DODO_PAYMENTS_WEBHOOK_SECRET: secret("dodo-webhook"),
  R2_ENDPOINT: "https://r2.smoke.example.com",
  R2_BUCKET: "smoke",
  R2_ACCESS_KEY_ID: secret("r2-id"),
  R2_SECRET_ACCESS_KEY: secret("r2-key"),
  R2_PUBLIC_BASE_URL: "https://assets.smoke.example.com",
  GITHUB_SYNC_ENABLED: "false",
  CHANGELOG_RELEASE_SYNC_ENABLED: "false",
};

/** What the child may inherit from the calling shell: what the OS and node need to run. */
const INHERITED_ENV = ["PATH", "HOME", "USERPROFILE", "SystemRoot", "TEMP", "TMP", "ComSpec"];

const env = {
  ...Object.fromEntries(
    INHERITED_ENV.filter((name) => process.env[name] !== undefined).map((name) => [
      name,
      process.env[name],
    ]),
  ),
  ...SMOKE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
};

const port = Number(env.PORT);
const base = `http://127.0.0.1:${port}`;

let output = "";
// An empty working directory: the server runs `dotenv.config()`, which reads ./.env, and a
// developer's apps/server/.env can hold live credentials. Nothing here may come from it.
const cwd = mkdtempSync(path.join(os.tmpdir(), "veriworkly-smoke-"));
process.on("exit", () => rmSync(cwd, { recursive: true, force: true }));

const child = spawn(process.execPath, [entry], { cwd, env, stdio: "pipe" });
child.stdout.on("data", (chunk) => (output += chunk));
child.stderr.on("data", (chunk) => (output += chunk));

let exited = null;
const exitedPromise = new Promise((resolve) =>
  child.on("exit", (code, signal) => {
    exited = { code, signal };
    resolve(exited);
  }),
);

function fail(message) {
  console.error(`smoke-boot: FAIL: ${message}`);
  console.error("---- server output ----");
  console.error(output.trim() || "(none)");
  if (!exited) child.kill("SIGKILL");
  process.exit(1);
}

async function get(pathname) {
  const response = await fetch(`${base}${pathname}`, { signal: AbortSignal.timeout(5_000) });
  return { status: response.status, body: await response.text() };
}

async function waitForLive() {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (exited) fail(`server exited during boot (${JSON.stringify(exited)})`);
    try {
      const { status } = await get("/api/v1/health");
      if (status === 200) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail(`no 200 from /api/v1/health within ${BOOT_TIMEOUT_MS} ms`);
}

await waitForLive();
console.log("smoke-boot: /api/v1/health 200");

// Readiness probes Postgres and Redis; a worker can be live a moment before its pool is warm.
let ready;
for (let attempt = 0; attempt < 10; attempt += 1) {
  ready = await get("/api/v1/health/ready").catch((error) => ({ status: 0, body: String(error) }));
  if (ready.status === 200) break;
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}
if (ready.status !== 200) fail(`/api/v1/health/ready answered ${ready.status}: ${ready.body}`);
console.log("smoke-boot: /api/v1/health/ready 200");

const unknown = await get(`/api/v1/smoke-${Date.now()}`);
if (unknown.status !== 404) fail(`an unknown path answered ${unknown.status}, expected 404`);

child.kill("SIGTERM");
const stopped = await Promise.race([
  exitedPromise,
  new Promise((resolve) => setTimeout(() => resolve(null), STOP_TIMEOUT_MS)),
]);
if (!stopped) fail(`server did not exit within ${STOP_TIMEOUT_MS} ms of SIGTERM`);
// On Windows a SIGTERM is a hard kill with no code; elsewhere the shutdown must be clean.
if (process.platform !== "win32" && stopped.code !== 0)
  fail(`server exited with ${JSON.stringify(stopped)} after SIGTERM`);

console.log(`smoke-boot: OK (stopped: ${JSON.stringify(stopped)})`);
