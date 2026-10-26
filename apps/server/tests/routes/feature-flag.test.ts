import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { requireFeatureEnabled } from "../../src/middleware/featureFlag.js";

function appWith(enabled: boolean) {
  const app = express();
  app.use(requireFeatureEnabled(enabled, "The affiliate program"));
  app.get("/", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

/**
 * V-193: a growth program that is switched off answers 503 with a machine-readable code, so the
 * studio can show "program unavailable" instead of an outage without matching the wording.
 */
describe("requireFeatureEnabled", () => {
  it("answers a switched-off program with 503 and details.code PROGRAM_DISABLED", async () => {
    const response = await request(appWith(false)).get("/");

    expect(response.status).toBe(503);
    expect(response.body.details).toEqual({ code: "PROGRAM_DISABLED" });
    expect(response.body.message).toBe(
      "The affiliate program is not available yet. Check back soon.",
    );
  });

  it("passes through when the program is on", async () => {
    const response = await request(appWith(true)).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
