import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * V-161: the image installs dependencies the way CI does. CI runs `npm ci --legacy-peer-deps`, so
 * a peer conflict CI tolerates must not break only the Docker build.
 */
const serverRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(serverRoot, "../..");

describe("Dockerfile dependency install", () => {
  it("passes --legacy-peer-deps to every npm ci and npm prune, as the CI workflows do", () => {
    const workflows = fs
      .readdirSync(path.join(repoRoot, ".github/workflows"))
      .map((name) => fs.readFileSync(path.join(repoRoot, ".github/workflows", name), "utf8"));
    expect(workflows.some((text) => text.includes("npm ci --legacy-peer-deps"))).toBe(true);

    const dockerfile = fs.readFileSync(path.join(serverRoot, "Dockerfile"), "utf8");
    const installs = dockerfile
      .split(/\r?\n/)
      .filter((line) => /^RUN npm (ci|prune)\b/.test(line.trim()));
    expect(installs.length).toBeGreaterThanOrEqual(2);
    for (const line of installs) expect(line).toContain("--legacy-peer-deps");
  });
});

describe("Dockerfile build stage (V-343)", () => {
  /** Paths the build stage copies before it runs the server build, relative to apps/server. */
  function copiedBeforeBuild(dockerfile: string): string[] {
    const lines = dockerfile.split(/\r?\n/).map((line) => line.trim());
    const build = lines.findIndex((line) => line.startsWith("RUN npm run build"));
    expect(build).toBeGreaterThan(0);
    return lines
      .slice(0, build)
      .filter((line) => line.startsWith("COPY apps/server/"))
      .map((line) => line.split(/\s+/)[1]!.replace(/^apps\/server\//, ""));
  }

  it("copies every local file prisma.config.ts imports, or `prisma generate` fails the build", () => {
    const dockerfile = fs.readFileSync(path.join(serverRoot, "Dockerfile"), "utf8");
    const config = fs.readFileSync(path.join(serverRoot, "prisma.config.ts"), "utf8");
    const localImports = [...config.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)].map((m) =>
      path.posix.normalize(m[1]!),
    );
    expect(localImports.length).toBeGreaterThan(0);

    const copied = copiedBeforeBuild(dockerfile);
    expect(copied).toContain("prisma.config.ts");
    for (const target of localImports) {
      const covered = copied.some(
        (source) =>
          target === source ||
          target === source.replace(/\.ts$/, "") ||
          target.startsWith(`${source}/`),
      );
      expect(covered, `${target} is imported by prisma.config.ts but not copied`).toBe(true);
    }
  });
});
