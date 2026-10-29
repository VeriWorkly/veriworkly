import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** One import reaches into Next's private files; a Next upgrade that moves it fails here, not in production. */

const require = createRequire(import.meta.url);

describe("private Next modules the site relies on", () => {
  it("html-bots still exports the bot pattern next.config.ts extends", () => {
    const { HTML_LIMITED_BOT_UA_RE } = require("next/dist/shared/lib/router/utils/html-bots");
    expect(HTML_LIMITED_BOT_UA_RE).toBeInstanceOf(RegExp);
    expect(HTML_LIMITED_BOT_UA_RE.test("Twitterbot/1.0")).toBe(true);
  });

  it("WebVitals.tsx uses the public next/web-vitals hook, not the compiled copy (W-091)", () => {
    const source = readFileSync(join(__dirname, "..", "..", "components", "WebVitals.tsx"), "utf8");
    expect(source).toContain('from "next/web-vitals"');
    expect(source).not.toContain("next/dist/");
  });
});
