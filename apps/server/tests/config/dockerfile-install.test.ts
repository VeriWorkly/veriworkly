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
