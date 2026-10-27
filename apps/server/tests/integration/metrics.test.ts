import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { app } from "#app";
import { config } from "#config";
import { pool } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import {
  JOB_BASELINE_KEY,
  JOB_LAST_SUCCESS_KEY,
  JOB_SCHEDULES,
  markJobsBaseline,
  recordJobSuccess,
} from "#lib/metrics";

import { INTERNAL_API_KEY_VALUE, STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

/**
 * V-115 / V-059 / observability: the per-worker metrics endpoint, the job staleness report and
 * the connection settings every pooled connection carries, against a real Postgres and Redis.
 */

const originalKey = config.internal.apiKey;

afterEach(() => {
  config.internal.apiKey = originalKey;
});

describe("GET /api/v1/health/metrics", () => {
  it("is 404 when INTERNAL_API_KEY is not configured", async () => {
    config.internal.apiKey = "";
    const res = await request(app)
      .get("/api/v1/health/metrics")
      .set("x-internal-key", INTERNAL_API_KEY_VALUE);
    expect(res.status).toBe(404);
  });

  it("is 401 without the key or with a wrong key", async () => {
    expect((await request(app).get("/api/v1/health/metrics")).status).toBe(401);
    expect(
      (await request(app).get("/api/v1/health/metrics").set("x-internal-key", "nope")).status,
    ).toBe(401);
  });

  it("serves Prometheus text with the route pattern, never the raw id", async () => {
    const user = await createUserWithSession();
    await request(app)
      .get("/api/v1/users/someone-unique-42/availability")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    const res = await request(app)
      .get("/api/v1/health/metrics")
      .set("x-internal-key", INTERNAL_API_KEY_VALUE);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/plain;.*version=0\.0\.4/);
    expect(res.text).toContain("# TYPE http_request_duration_seconds histogram");
    expect(res.text).toMatch(
      /http_request_duration_seconds_count\{method="GET",route="\/api\/v1\/users\/:username\/availability",status_class="[2-5]xx"\} \d+/,
    );
    expect(res.text).toMatch(
      /http_request_duration_seconds_bucket\{method="GET",route="\/api\/v1\/users\/:username\/availability",status_class="[2-5]xx",le="\+Inf"\} \d+/,
    );
    expect(res.text).not.toContain("someone-unique-42");

    expect(res.text).toMatch(/db_pool_connections\{state="total"\} \d+/);
    expect(res.text).toMatch(/db_pool_connections\{state="waiting"\} \d+/);
    expect(res.text).toMatch(/ats_extract_queue_depth \d+/);
    expect(res.text).toMatch(/ats_extract_queue_max \d+/);
    // The limiter EVAL ran for the users request above.
    expect(res.text).toMatch(
      /redis_command_duration_seconds_count\{command="ratelimit_eval"\} \d+/,
    );
  });
});

describe("GET /api/v1/health/jobs", () => {
  it("requires the internal key", async () => {
    expect((await request(app).get("/api/v1/health/jobs")).status).toBe(401);
  });

  it("flags a job stale when its last success is older than twice its interval", async () => {
    const now = Date.now();
    // Jobs have been scheduled for days: a job with no success on record is overdue.
    await getRedis().set(JOB_BASELINE_KEY, String(now - 3 * 24 * 3_600_000));
    recordJobSuccess("views-flush", now - 60_000);
    // Written by another worker or replica: only Redis knows about it.
    await getRedis().hSet(JOB_LAST_SUCCESS_KEY, "credit-sweep", String(now - 3 * 3_600_000));

    const res = await request(app)
      .get("/api/v1/health/jobs")
      .set("x-internal-key", INTERNAL_API_KEY_VALUE);

    expect(res.status).toBe(200);
    const jobs = res.body.data.jobs as Array<{
      name: string;
      lastSuccessAt: string | null;
      intervalSeconds: number;
      stale: boolean;
    }>;

    expect(jobs.map((j) => j.name).sort()).toEqual(Object.keys(JOB_SCHEDULES).sort());

    const views = jobs.find((j) => j.name === "views-flush")!;
    expect(views.stale).toBe(false);
    expect(views.intervalSeconds).toBe(600);

    const sweep = jobs.find((j) => j.name === "credit-sweep")!;
    expect(sweep.stale).toBe(true);
    expect(new Date(sweep.lastSuccessAt!).getTime()).toBe(now - 3 * 3_600_000);

    // Never succeeded on record, long after the baseline: reported as stale so an alert fires.
    const retention = jobs.find((j) => j.name === "retention")!;
    expect(retention.lastSuccessAt).toBeNull();
    expect(retention.stale).toBe(true);
    expect(res.body.data.stale).toBe(true);
  });

  describe("after a deploy", () => {
    const retentionStatus = async () => {
      const res = await request(app)
        .get("/api/v1/health/jobs")
        .set("x-internal-key", INTERNAL_API_KEY_VALUE);
      return (res.body.data.jobs as Array<{ name: string; stale: boolean }>).find(
        (job) => job.name === "retention",
      )!;
    };

    it("does not count a job with no success yet as stale until twice its interval has passed", async () => {
      await getRedis().del([JOB_LAST_SUCCESS_KEY, JOB_BASELINE_KEY]);

      // Boot: the first worker records when jobs started being scheduled.
      await markJobsBaseline();
      expect((await retentionStatus()).stale).toBe(false);

      // 49 hours later the daily job still has no success: now it is overdue.
      await getRedis().set(JOB_BASELINE_KEY, String(Date.now() - 49 * 3_600_000));
      expect((await retentionStatus()).stale).toBe(true);
    });

    it("keeps the first boot's baseline when later workers boot", async () => {
      await getRedis().del(JOB_BASELINE_KEY);

      await markJobsBaseline(1_000);
      await markJobsBaseline(2_000);

      expect(await getRedis().get(JOB_BASELINE_KEY)).toBe("1000");
      expect(await getRedis().ttl(JOB_BASELINE_KEY)).toBeGreaterThan(0);
    });
  });

  describe("jobs that are not scheduled", () => {
    const RETENTION_VARS = [
      "RETENTION_EXPIRED_SESSION_DAYS",
      "RETENTION_EXPIRED_VERIFICATION_DAYS",
      "RETENTION_WEBHOOK_PAYLOAD_DAYS",
      "RETENTION_AUDIT_LOG_DAYS",
      "RETENTION_ADMIN_AUDIT_DAYS",
      "RETENTION_ADMIN_MONEY_AUDIT_DAYS",
      "RETENTION_CREDIT_RESERVATION_DAYS",
      "RETENTION_CREDIT_REPLAY_DAYS",
      "RETENTION_FLUSH_BATCH_DAYS",
      "RETENTION_AFFILIATE_CLICK_DAYS",
      "RETENTION_PORTFOLIO_VIEW_DAYS",
      "RETENTION_DELETED_DOCUMENT_DAYS",
    ];

    afterEach(() => {
      for (const name of RETENTION_VARS) delete process.env[name];
    });

    it("are reported disabled, never stale, and do not make the report stale", async () => {
      // The suite runs with GITHUB_SYNC_ENABLED and CHANGELOG_RELEASE_SYNC_ENABLED false.
      for (const name of RETENTION_VARS) process.env[name] = "0";
      await getRedis().del(JOB_LAST_SUCCESS_KEY);
      const now = Date.now();
      for (const name of [
        "views-flush",
        "usage-metrics",
        "portfolio-access",
        "credit-sweep",
        "annual-credits",
      ])
        recordJobSuccess(name, now);

      const res = await request(app)
        .get("/api/v1/health/jobs")
        .set("x-internal-key", INTERNAL_API_KEY_VALUE);

      const jobs = res.body.data.jobs as Array<{ name: string; enabled: boolean; stale: boolean }>;
      const byName = new Map(jobs.map((job) => [job.name, job]));
      for (const name of ["github-sync", "changelog-sync", "retention"])
        expect(byName.get(name)).toMatchObject({ enabled: false, stale: false });
      expect(byName.get("views-flush")).toMatchObject({ enabled: true, stale: false });
      expect(res.body.data.stale).toBe(false);
    });

    it("counts GitHub sync as not scheduled when enabled but GITHUB_OWNER/GITHUB_REPO are unset", async () => {
      const original = { ...config.github };
      Object.assign(config.github, { syncEnabled: true, owner: "", repo: "" });
      try {
        const res = await request(app)
          .get("/api/v1/health/jobs")
          .set("x-internal-key", INTERNAL_API_KEY_VALUE);
        const github = (res.body.data.jobs as Array<{ name: string; enabled: boolean }>).find(
          (job) => job.name === "github-sync",
        );
        expect(github?.enabled).toBe(false);

        Object.assign(config.github, { owner: "x", repo: "y" });
        const configured = await request(app)
          .get("/api/v1/health/jobs")
          .set("x-internal-key", INTERNAL_API_KEY_VALUE);
        expect(
          (configured.body.data.jobs as Array<{ name: string; enabled: boolean }>).find(
            (job) => job.name === "github-sync",
          )?.enabled,
        ).toBe(true);
      } finally {
        Object.assign(config.github, original);
      }
    });
  });
});

describe("pooled connection settings (V-115)", () => {
  it("names the connection and sends no idle-in-transaction timeout unless one is set", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ app: string; idle: string }>(
        "SELECT current_setting('application_name') AS app, current_setting('idle_in_transaction_session_timeout') AS idle",
      );
      expect(rows[0].app).toMatch(/^veriworkly-api-w\d+$/);
      // Opt-in (DB_IDLE_IN_TRANSACTION_TIMEOUT_MS): a pooler may refuse the startup parameter.
      expect(rows[0].idle).toBe("0");
    } finally {
      client.release();
    }
  });
});
