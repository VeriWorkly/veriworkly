import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SHUTDOWN_TIMINGS } from "#lib/shutdown";

/**
 * V-373: a deploy must never leave nobody listening, and V-313: the drain must fit inside every
 * force kill above it. The shipped pm2 file runs two copies that the rolling script restarts one
 * at a time; these checks keep the file, the script and the drain timings in step.
 */

const serverRoot = path.resolve(__dirname, "..", "..");
const ecosystem = createRequire(__filename)(path.join(serverRoot, "ecosystem.config.cjs")) as {
  apps: Array<{
    name: string;
    exec_mode: string;
    kill_timeout: number;
    env: { PORT: string; WEB_CONCURRENCY: string };
  }>;
};

describe("the shutdown timeline fits inside every force kill (V-313)", () => {
  it("aborts AI work at the grace, stops waiting at the hard cap, and closes before throng and pm2 kill", () => {
    const t = SHUTDOWN_TIMINGS;
    expect(t.httpGraceMs).toBeLessThan(t.httpHardCapMs);
    // Room after the hard cap (and the job drain) to close Redis, flush audit rows and Prisma.
    expect(Math.max(t.httpHardCapMs, t.jobDrainMs) + 5_000).toBeLessThanOrEqual(t.throngGraceMs);
    expect(t.throngGraceMs).toBeLessThan(t.processManagerKillMs);
  });

  it("compose waits as long as pm2 does before its SIGKILL", () => {
    const compose = readFileSync(path.join(serverRoot, "..", "..", "compose.yaml"), "utf8");
    const grace = /stop_grace_period:\s*(\d+)s/.exec(compose);
    expect(Number(grace?.[1]) * 1000).toBeGreaterThanOrEqual(SHUTDOWN_TIMINGS.processManagerKillMs);
  });
});

describe("a deploy restarts one API copy at a time (V-373)", () => {
  it("ships two forked copies on distinct ports, each waiting out the drain", () => {
    expect(ecosystem.apps).toHaveLength(2);
    const ports = ecosystem.apps.map((app) => app.env.PORT);
    expect(new Set(ports).size).toBe(2);
    for (const app of ecosystem.apps) {
      expect(app.exec_mode).toBe("fork");
      expect(app.kill_timeout).toBeGreaterThanOrEqual(SHUTDOWN_TIMINGS.processManagerKillMs);
    }
  });

  it("the rolling script restarts each copy and waits for it to be ready before the next", () => {
    const script = readFileSync(path.join(serverRoot, "scripts", "rolling-restart.sh"), "utf8");
    const steps = script
      .split("\n")
      .filter((line) => /^(pm2 restart|wait_ready) /.test(line))
      .map((line) => line.trim());

    expect(steps).toEqual(
      ecosystem.apps.flatMap((app) => [
        `pm2 restart ${app.name}`,
        `wait_ready ${app.name} ${app.env.PORT}`,
      ]),
    );
  });
});

describe("two copies keep the single copy's Postgres budget", () => {
  it("the per-copy budgets sum to the production default the single copy had", async () => {
    const { resolvePoolBudget } = await import("#lib/prisma");
    // One copy with 2 workers used to open at most 80 connections (DB_POOL_MAX_TOTAL default).
    const single = resolvePoolBudget({
      workers: 2,
      budget: 80,
      explicitPoolMax: undefined,
      production: true,
    });

    const copies = ecosystem.apps.map((app) => {
      const env = app.env as { DB_POOL_MAX_TOTAL?: string; WEB_CONCURRENCY: string };
      expect(env.DB_POOL_MAX_TOTAL, `${app.name} sets DB_POOL_MAX_TOTAL`).toMatch(/^\d+$/);
      return resolvePoolBudget({
        workers: Number(env.WEB_CONCURRENCY),
        budget: Number(env.DB_POOL_MAX_TOTAL),
        explicitPoolMax: undefined,
        production: true,
      });
    });

    expect(copies.reduce((sum, copy) => sum + copy.total, 0)).toBe(single.total);
  });
});

describe("the rolling script never takes the last healthy copy down", () => {
  const script = readFileSync(path.join(serverRoot, "scripts", "rolling-restart.sh"), "utf8");

  it("checks the other copy is ready before restarting each one", () => {
    const steps = script
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^(pm2 restart|wait_ready|require_ready) /.test(line));
    const [a, b] = ecosystem.apps;
    expect(steps).toEqual([
      `require_ready ${b!.name} ${b!.env.PORT}`,
      `pm2 restart ${a!.name}`,
      `wait_ready ${a!.name} ${a!.env.PORT}`,
      `require_ready ${a!.name} ${a!.env.PORT}`,
      `pm2 restart ${b!.name}`,
      `wait_ready ${b!.name} ${b!.env.PORT}`,
    ]);
  });

  it("keeps curl quiet while a copy boots", () => {
    for (const line of script.split("\n").filter((l) => l.includes("curl ")))
      expect(line).toMatch(/2>\s*\/dev\/null|-s\b(?!S)/);
  });
});
