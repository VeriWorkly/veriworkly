import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const studio = path.resolve(__dirname, "../..");

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    }),
  );
  return nested.flat();
}

const isClientModule = (source: string) => /^\s*["']use client["']/.test(source);

async function resolveAlias(specifier: string) {
  const base = path.join(studio, specifier.slice(2));
  for (const candidate of [`${base}.tsx`, `${base}.ts`, path.join(base, "index.ts")]) {
    const source = await readFile(candidate, "utf8").catch(() => null);
    if (source !== null) return source;
  }
  return null;
}

describe("server ↔ client module boundary", () => {
  // A server component can render a client component, but calling a plain function exported from
  // a "use client" module throws at request time ("Attempted to call … from the server").
  it("S-363 no server file imports a helper function from a client module", async () => {
    const offenders: string[] = [];

    const serverEntries = (await sourceFiles(path.join(studio, "app"))).filter((file) =>
      /^(page|layout|route)\.tsx?$/.test(path.basename(file)),
    );

    for (const file of serverEntries) {
      const source = await readFile(file, "utf8");
      if (isClientModule(source)) continue;

      for (const match of source.matchAll(
        /import\s+(?!type\b)([^;]*?)\s+from\s+["'](@\/[^"']+)["']/g,
      )) {
        const named = match[1].match(/\{([^}]*)\}/)?.[1] ?? "";
        const helpers = named
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name && !name.startsWith("type ") && /^[a-z]/.test(name));
        if (!helpers.length) continue;

        const target = await resolveAlias(match[2]);
        if (target && isClientModule(target)) {
          offenders.push(`${path.relative(studio, file)} → ${match[2]} { ${helpers.join(", ")} }`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
