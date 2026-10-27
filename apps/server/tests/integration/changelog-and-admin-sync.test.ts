import { readFile } from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { app } from "#app";
import { config } from "#config";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { isChangelogSyncJobEnabled } from "#jobs/changelogSyncJob";
import { syncChangelogFromGitHubReleases } from "#services/changelog/index";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-066 (which changelog rows the sync may re-parse) and V-080 (admin syncs run in the background
 * and answer 202). GitHub is mocked at `fetch`; the stores and the request path are real.
 */

const ADMIN = "/api/v1/admin";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const release = (body: string) => ({
  id: 1,
  tag_name: "v4.1.0",
  name: "v4.1.0 - Spring",
  body,
  html_url: "https://github.com/x/y/releases/tag/v4.1.0",
  published_at: "2026-09-10T00:00:00Z",
  draft: false,
  prerelease: false,
});

const mergedPr = (number: number) => ({
  number,
  title: `PR ${number}`,
  html_url: `https://github.com/x/y/pull/${number}`,
  user: {
    login: "dev",
    avatar_url: "https://avatars.test/dev",
    html_url: "https://github.com/dev",
  },
  merged_at: "2026-09-09T00:00:00Z",
  head: { ref: `feature-${number}` },
  base: { ref: "master" },
});

/** What the mocked GitHub serves; tests change it between syncs. */
let releaseBody = "### Fixed\n- first fix";
let pulls: unknown[] = [];
/** When set, every GitHub call waits for it: a sync that is still running. */
let gate: Promise<void> | null = null;

function mockGitHub() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (gate) await gate;
    const url = String(input);
    if (url.includes("/releases") && url.includes("page=1")) return json([release(releaseBody)]);
    if (url.includes("/pulls") && url.includes("page=1")) return json(pulls);
    return json([]);
  });
}

let adminPromise: Promise<TestUser> | undefined;
const adminUser = () =>
  (adminPromise ??= createUserWithSession({ email: "admin@example.test", emailVerified: true }));

async function asAdmin(method: "get" | "post" | "put" | "delete", url: string, body?: object) {
  const admin = await adminUser();
  const pending = request(app)
    [method](url)
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", admin.cookie);
  return body ? pending.send(body) : pending;
}

async function waitFor(check: () => Promise<boolean>, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error("timed out waiting for the background sync");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

const original = { ...config.github };

beforeEach(async () => {
  await getRedis().flushDb();
  await prisma.changelogEntry.deleteMany();
  await prisma.gitHubSync.deleteMany();
  Object.assign(config.github, { owner: "x", repo: "y", token: "token" });
  releaseBody = "### Fixed\n- first fix";
  pulls = [];
  gate = null;
});

afterEach(() => {
  Object.assign(config.github, original);
});

describe("changelog sync re-parses rows no admin edited (V-066)", () => {
  it("keeps re-parsing after its own prRefs update, and stops once an admin edits the entry", async () => {
    mockGitHub();

    await syncChangelogFromGitHubReleases();
    expect(
      (await prisma.changelogEntry.findUniqueOrThrow({ where: { id: "v4-1-0" } })).fixed,
    ).toEqual(["first fix"]);
    // Created an hour ago, as every real row is by the time a later sync sees it.
    await prisma.changelogEntry.update({
      where: { id: "v4-1-0" },
      data: { createdAt: new Date(Date.now() - 3_600_000) },
    });

    // A merged PR appears: the sync's own write fills prRefs and moves updatedAt.
    pulls = [mergedPr(7)];
    await syncChangelogFromGitHubReleases();
    const withPrs = await prisma.changelogEntry.findUniqueOrThrow({ where: { id: "v4-1-0" } });
    expect((withPrs.prRefs as Array<{ number: number }>).map((pr) => pr.number)).toEqual([7]);

    // The parsed text changes (a parser fix, or edited notes): the row is still the sync's own.
    releaseBody = "### Fixed\n- first fix\n- second fix";
    const result = await syncChangelogFromGitHubReleases();
    expect(result.refreshed).toBe(1);
    expect(
      (await prisma.changelogEntry.findUniqueOrThrow({ where: { id: "v4-1-0" } })).fixed,
    ).toEqual(["first fix", "second fix"]);

    // An admin curates the text. The sync may still add PRs, but never rewrites the text again.
    const edited = await asAdmin("put", `${ADMIN}/changelog/v4-1-0`, { fixed: ["curated"] });
    expect(edited.status).toBe(200);

    releaseBody = "### Fixed\n- something else entirely";
    pulls = [mergedPr(7), mergedPr(8)];
    await syncChangelogFromGitHubReleases();

    const after = await prisma.changelogEntry.findUniqueOrThrow({ where: { id: "v4-1-0" } });
    expect(after.fixed).toEqual(["curated"]);
    expect((after.prRefs as Array<{ number: number }>).map((pr) => pr.number)).toEqual([8, 7]);
  });
});

describe("admin syncs run in the background (V-080)", () => {
  it("POST /admin/system/github/sync answers 202 at once; the status endpoint reports the run", async () => {
    let open: () => void = () => {};
    gate = new Promise((resolve) => (open = resolve));
    mockGitHub();

    const started = await asAdmin("post", `${ADMIN}/system/github/sync`, {
      reason: "integration test",
    });
    expect(started.status).toBe(202);
    expect(started.body.data).toMatchObject({ status: "started" });

    // Still running: a second trigger is refused, and the status says so.
    const second = await asAdmin("post", `${ADMIN}/system/github/sync`, { reason: "again" });
    expect(second.status).toBe(409);
    const running = await asAdmin("get", `${ADMIN}/system/github`);
    expect(running.body.data.running).toBe(true);

    open();
    gate = null;
    await waitFor(
      async () => (await asAdmin("get", `${ADMIN}/system/github`)).body.data.running === false,
    );

    const done = await asAdmin("get", `${ADMIN}/system/github`);
    expect(done.body.data.latestSync).toMatchObject({ lastSyncStatus: "ok", lastError: null });
  });

  it("POST /admin/changelog/sync answers 202; GET /admin/changelog/sync reports running, then the result", async () => {
    let open: () => void = () => {};
    gate = new Promise((resolve) => (open = resolve));
    mockGitHub();

    const started = await asAdmin("post", `${ADMIN}/changelog/sync`);
    expect(started.status).toBe(202);
    expect(started.body.data).toMatchObject({ status: "started" });

    expect((await asAdmin("post", `${ADMIN}/changelog/sync`)).status).toBe(409);
    expect((await asAdmin("get", `${ADMIN}/changelog/sync`)).body.data.running).toBe(true);

    open();
    gate = null;
    await waitFor(
      async () => (await asAdmin("get", `${ADMIN}/changelog/sync`)).body.data.running === false,
    );

    const status = (await asAdmin("get", `${ADMIN}/changelog/sync`)).body.data;
    expect(status.lastRun).toMatchObject({ status: "ok", result: { created: 1 } });
    expect(await prisma.changelogEntry.count()).toBe(1);
  });

  it("answers 503, not 500, when Redis refuses the sync lock", async () => {
    mockGitHub();
    const redis = getRedis();
    const set = redis.set.bind(redis);
    vi.spyOn(redis, "set").mockImplementation(((key: string, ...rest: unknown[]) =>
      key.includes("sync") && key.includes("lock")
        ? Promise.reject(new Error("Connection is closed."))
        : (set as (...args: unknown[]) => unknown)(key, ...rest)) as typeof redis.set);

    const github = await asAdmin("post", `${ADMIN}/system/github/sync`, { reason: "redis down" });
    expect(github.status).toBe(503);

    const changelog = await asAdmin("post", `${ADMIN}/changelog/sync`);
    expect(changelog.status).toBe(503);
  });

  /**
   * The audit entry is written once the sync has started. A sync moves no money or privilege
   * (V-074 requires a transactional audit only for those), so a failed audit write is logged and
   * the admin still gets the 202 for the sync that is running, never a 500 that invites a retry.
   */
  it("still answers 202 when the audit write fails after the sync started", async () => {
    mockGitHub();
    await adminUser();
    vi.spyOn(prisma.adminAuditEntry, "create").mockRejectedValue(new Error("audit down"));

    const github = await asAdmin("post", `${ADMIN}/system/github/sync`, { reason: "audit down" });
    expect(github.status).toBe(202);
    const changelog = await asAdmin("post", `${ADMIN}/changelog/sync`);
    expect(changelog.status).toBe(202);

    await waitFor(
      async () =>
        (await asAdmin("get", `${ADMIN}/system/github`)).body.data.running === false &&
        (await asAdmin("get", `${ADMIN}/changelog/sync`)).body.data.running === false,
    );
  });
});

describe("changelog sync without GitHub configured (V-260)", () => {
  it.each(["owner", "repo", "token"] as const)(
    "with no GitHub %s the job is not scheduled and the admin trigger answers 503",
    async (missing) => {
      const fetchSpy = mockGitHub();
      Object.assign(config.github, { [missing]: "" });
      // The integration env turns the schedule off; this test is about the GitHub settings.
      const scheduled = config.changelogSync.enabled;
      config.changelogSync.enabled = true;
      onTestFinished(() => void (config.changelogSync.enabled = scheduled));

      // /health/jobs reports a disabled job as disabled, never as stale.
      expect(isChangelogSyncJobEnabled()).toBe(false);

      const res = await asAdmin("post", `${ADMIN}/changelog/sync`);
      expect(res.status).toBe(503);
      expect(fetchSpy).not.toHaveBeenCalled();
      // No lock was taken, so a later configured sync is not refused with 409.
      Object.assign(config.github, { owner: "x", repo: "y", token: "token" });
      expect(isChangelogSyncJobEnabled()).toBe(true);
      expect((await asAdmin("post", `${ADMIN}/changelog/sync`)).status).toBe(202);
      await waitFor(
        async () => (await asAdmin("get", `${ADMIN}/changelog/sync`)).body.data.running === false,
      );
    },
  );
});

describe("the editedAt backfill migration (V-066)", () => {
  /** The migration's UPDATE statements, run again on rows seeded as they were before it. */
  async function runBackfill() {
    const dir = path.resolve(
      import.meta.dirname,
      "../../prisma/migrations/20261025210000_changelog_entry_edited_at",
    );
    const sql = (await readFile(path.join(dir, "migration.sql"), "utf8"))
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    for (const statement of sql.split(";").map((part) => part.trim()))
      if (statement.startsWith("UPDATE")) await prisma.$executeRawUnsafe(statement);
  }

  async function seedEntry(id: string, createdAt: Date, updatedAt: Date) {
    await prisma.changelogEntry.create({
      data: {
        id,
        version: id,
        title: id,
        publishedAt: createdAt,
        tags: ["auto-synced"],
        createdAt,
      },
    });
    await prisma.$executeRaw`UPDATE "ChangelogEntry" SET "updatedAt" = ${updatedAt}, "editedAt" = NULL WHERE id = ${id}`;
  }

  it("marks as edited every row the old updatedAt heuristic treated as edited, and audited ones", async () => {
    await prisma.changelogEntry.deleteMany();
    const created = new Date("2026-01-01T00:00:00.000Z");
    const later = new Date("2026-02-01T00:00:00.000Z");
    const auditedAt = new Date("2026-03-01T00:00:00.000Z");

    await seedEntry("untouched", created, new Date(created.getTime() + 200));
    // Edited before audit existed, or in Prisma Studio: only updatedAt says so.
    await seedEntry("edited-unaudited", created, later);
    await seedEntry("edited-audited", created, created);
    await prisma.adminAuditEntry.create({
      data: {
        action: "changelog.entry.update",
        targetType: "ChangelogEntry",
        targetId: "edited-audited",
        createdAt: auditedAt,
      },
    });

    await runBackfill();

    const rows = await prisma.changelogEntry.findMany({ select: { id: true, editedAt: true } });
    const editedAt = Object.fromEntries(rows.map((row) => [row.id, row.editedAt]));
    expect(editedAt["untouched"]).toBeNull();
    expect(editedAt["edited-unaudited"]).toEqual(later);
    expect(editedAt["edited-audited"]).toEqual(auditedAt);
  });
});

describe("changelog release LOWs", () => {
  it("skips prereleases and strips an em-dash version prefix from the title", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/releases") && url.includes("page=1"))
        return json([
          { ...release("### Fixed\n- a fix"), name: "v4.1.0 — Spring" },
          {
            ...release("### Added\n- preview"),
            id: 2,
            tag_name: "v4.2.0-rc.1",
            name: "v4.2.0-rc.1 — Preview",
            prerelease: true,
          },
        ]);
      return json([]);
    });

    await syncChangelogFromGitHubReleases();

    const entries = await prisma.changelogEntry.findMany({ select: { id: true, title: true } });
    expect(entries).toEqual([{ id: "v4-1-0", title: "Spring" }]);
  });

  it("does not double the v of a version an admin typed with one", async () => {
    const created = await asAdmin("post", `${ADMIN}/changelog`, {
      version: "v3.32.0",
      title: "Typed with a v",
      type: "minor",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.id).toBe("v3-32-0");
  });
});

describe("an admin delete of a synced release stays deleted (V-289)", () => {
  afterEach(async () => {
    // The record a delete leaves behind, so the next test starts from no deletes at all.
    await prisma.$executeRawUnsafe(`DO $$ BEGIN
      IF to_regclass('"ChangelogReleaseTombstone"') IS NOT NULL THEN
        DELETE FROM "ChangelogReleaseTombstone";
      END IF; END $$`);
  });

  it("is not recreated by the next sync, and is gone from the public changelog", async () => {
    mockGitHub();
    await syncChangelogFromGitHubReleases();
    expect(await prisma.changelogEntry.count({ where: { id: "v4-1-0" } })).toBe(1);

    const removed = await asAdmin("delete", `${ADMIN}/changelog/v4-1-0`);
    expect(removed.status, JSON.stringify(removed.body)).toBe(200);

    await syncChangelogFromGitHubReleases();
    expect(await prisma.changelogEntry.count({ where: { id: "v4-1-0" } })).toBe(0);

    const list = await request(app).get("/api/v1/changelog").set("Origin", STUDIO_ORIGIN);
    expect(list.status).toBe(200);
    expect(list.body.data.items.map((item: { id: string }) => item.id)).not.toContain("v4-1-0");
  });

  it("comes back when an admin writes the entry again by hand", async () => {
    mockGitHub();
    await syncChangelogFromGitHubReleases();
    await asAdmin("delete", `${ADMIN}/changelog/v4-1-0`);

    const created = await asAdmin("post", `${ADMIN}/changelog`, {
      id: "v4-1-0",
      version: "4.1.0",
      title: "Spring, corrected",
      type: "minor",
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    await prisma.changelogEntry.delete({ where: { id: "v4-1-0" } });

    // Writing it by hand withdrew the delete: the release syncs again like any other.
    await syncChangelogFromGitHubReleases();
    expect(await prisma.changelogEntry.count({ where: { id: "v4-1-0" } })).toBe(1);
  });

  it("does not block a release whose id a deleted hand-made entry once used", async () => {
    mockGitHub();
    const created = await asAdmin("post", `${ADMIN}/changelog`, {
      id: "v4-1-0",
      version: "4.1.0",
      title: "Drafted by hand before the release",
      type: "minor",
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect((await asAdmin("delete", `${ADMIN}/changelog/v4-1-0`)).status).toBe(200);

    await syncChangelogFromGitHubReleases();
    expect(await prisma.changelogEntry.count({ where: { id: "v4-1-0" } })).toBe(1);
  });
});
