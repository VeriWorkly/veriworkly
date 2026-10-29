import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

/** scripts/measure-js.mts --check, run against a fake `.next` build: CI's JS budget gate. */

const script = join(__dirname, "..", "..", "scripts", "measure-js.mts");
const tsx = createRequire(import.meta.url).resolve("tsx/cli");

let build: string;

beforeEach(() => {
  build = mkdtempSync(join(tmpdir(), "measure-js-"));
  mkdirSync(join(build, ".next", "server", "app"), { recursive: true });
  mkdirSync(join(build, ".next", "static", "chunks"), { recursive: true });
});

afterEach(() => rmSync(build, { recursive: true, force: true }));

const page = (route: string, chunkBytes: number) => {
  writeFileSync(join(build, ".next", "static", "chunks", "a.js"), "x".repeat(chunkBytes));
  writeFileSync(
    join(build, ".next", "server", "app", `${route.slice(1)}.html`),
    '<script src="/_next/static/chunks/a.js" async=""></script>',
  );
};

const check = (...routes: string[]) =>
  spawnSync(process.execPath, [tsx, script, "--check", ...routes], {
    cwd: build,
    encoding: "utf8",
  });

describe("measure-js --check", () => {
  it("passes a prerendered route under its budget", () => {
    page("/privacy", 1000);
    const run = check("/privacy");
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toMatch(/\| \/privacy \| \d+\.\d KB \| 188 KB \| 1 \|/);
  });

  it("fails a route that is not prerendered, since its JS cannot be measured", () => {
    const run = check("/privacy");
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("not prerendered ❌");
    expect(run.stderr).toContain("/privacy is not prerendered");
  });

  it("fails a route over its budget", () => {
    page("/privacy", 0);
    // Random bytes barely compress, so 200 KB of them stays over the 188 KB default once gzipped.
    const random = Array.from({ length: 4 }, () => randomBytes(51_200));
    writeFileSync(join(build, ".next", "static", "chunks", "a.js"), Buffer.concat(random));
    const run = check("/privacy");
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/\/privacy \d+\.\d KB > 188 KB/);
  });
});
