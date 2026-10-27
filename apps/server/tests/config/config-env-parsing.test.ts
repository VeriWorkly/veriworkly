import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn().mockReturnValue({}),
  },
}));

// `config` reads the environment once at import, so each case stubs it and re-imports.
async function loadConfig() {
  vi.resetModules();
  return (await import("../../src/config.js")).config;
}

describe("config reads the environment the way the boot schema checks it", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("trims and lowercases ADMIN_EMAIL, so a padded value still names the operator", async () => {
    vi.stubEnv("ADMIN_EMAIL", "  Ops@VeriWorkly.com \n");

    expect((await loadConfig()).admin.email).toBe("ops@veriworkly.com");
  });

  it("treats a blank boolean flag as unset (the default), not as off", async () => {
    // .env.example ships the program flags blank; outside production they default to on.
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "");
    vi.stubEnv("AMBASSADOR_PROGRAM_ENABLED", "  ");

    const config = await loadConfig();

    expect(config.growth.affiliateProgramEnabled).toBe(true);
    expect(config.growth.ambassadorProgramEnabled).toBe(true);
  });

  it("still reads an explicit false as off", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "false");

    expect((await loadConfig()).growth.affiliateProgramEnabled).toBe(false);
  });
});
