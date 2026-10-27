import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

/** Two imports reach into Next's private files (W-091); a Next upgrade that moves either fails here, not in production. */

const require = createRequire(import.meta.url);

describe("private Next modules the site relies on", () => {
  it("html-bots still exports the bot pattern next.config.ts extends", () => {
    const { HTML_LIMITED_BOT_UA_RE } = require("next/dist/shared/lib/router/utils/html-bots");
    expect(HTML_LIMITED_BOT_UA_RE).toBeInstanceOf(RegExp);
    expect(HTML_LIMITED_BOT_UA_RE.test("Twitterbot/1.0")).toBe(true);
  });

  it("the compiled web-vitals copy WebVitals.tsx loads is still there", () => {
    const vitals = require("next/dist/compiled/web-vitals");
    for (const name of ["onLCP", "onINP", "onCLS", "onFCP", "onTTFB"])
      expect(typeof vitals[name], name).toBe("function");
  });
});
