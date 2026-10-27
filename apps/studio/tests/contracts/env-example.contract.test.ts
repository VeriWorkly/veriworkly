import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  documentedEnvNames,
  envReads,
  findUndocumentedEnvReads,
  findUnreadEnvExampleEntries,
} from "../../scripts/check-env-example.mjs";

const studioDir = join(__dirname, "..", "..");

describe(".env.example documents every variable the studio reads", () => {
  it("finds the reads it checks", () => {
    // Guards the assertion below from passing on a scan that matched nothing.
    const reads = envReads(studioDir);

    expect(reads.has("NEXT_PUBLIC_BACKEND_URL")).toBe(true);
    expect(reads.has("INTERNAL_API_KEY")).toBe(true);
  });

  it("counts commented-out entries as documented", () => {
    expect(documentedEnvNames("A=1\n# B=\n#C=x\nnot D=1\n")).toEqual(new Set(["A", "B", "C"]));
  });

  it("has no process.env read missing from .env.example", () => {
    expect(findUndocumentedEnvReads(studioDir)).toEqual([]);
  });

  it("lists nothing in .env.example that no studio code reads", () => {
    expect(findUnreadEnvExampleEntries(studioDir)).toEqual([]);
  });
});

vi.mock("server-only", () => ({}));

describe("S-095 the program flags read an empty value as unset", () => {
  async function flags(nodeEnv: string, value: string | undefined) {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", value);
    vi.stubEnv("AMBASSADOR_PROGRAM_ENABLED", value);
    const flagModule = await import("@/lib/feature-flags");

    return [flagModule.isAffiliateProgramEnabled(), flagModule.isAmbassadorProgramEnabled()];
  }

  it.each([undefined, "", "  "])(
    "S-095 %j is on outside production and off in it",
    async (value) => {
      expect(await flags("development", value)).toEqual([true, true]);
      expect(await flags("production", value)).toEqual([false, false]);
    },
  );

  it.each(["true", "TRUE", " yes ", "1", "on"])(
    "S-095 %j turns them on in production",
    async (value) => {
      expect(await flags("production", value)).toEqual([true, true]);
    },
  );

  it.each(["false", "0", "off", "no"])(
    "S-095 %j turns them off outside production",
    async (value) => {
      expect(await flags("development", value)).toEqual([false, false]);
    },
  );
});

describe("S-353 the production server listens on loopback only", () => {
  it("S-353 `npm start` binds 127.0.0.1, so only nginx can reach it", () => {
    const { scripts } = JSON.parse(readFileSync(join(studioDir, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    // On every interface, a request to the port directly would skip nginx and set its own
    // X-Real-IP, which server renders forward to the API as the visitor's address.
    expect(scripts.start).toMatch(/^next start\b.*\s-H 127\.0\.0\.1\b/);
  });
});
