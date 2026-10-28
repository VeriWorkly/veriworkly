import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { app } from "#app";

import { STUDIO_ORIGIN } from "./env.js";

/**
 * V-393: the per-IP limits (and the anonymous ATS quotas, and the audit `ip`) key on the client
 * address the server resolves. A header any client can set (`X-Client-IP`, `CF-Connecting-IP`,
 * `X-Real-IP`) must never move that address, with `trust proxy` off or on; with it on, only the
 * proxy's `X-Forwarded-For` hop counts. The contact route allows 5 requests an hour per address.
 */
const CONTACT_LIMIT = 5;

function contact(headers: Record<string, string>) {
  const call = request(app).post("/api/v1/contact").set("Origin", STUDIO_ORIGIN);
  for (const [name, value] of Object.entries(headers)) call.set(name, value);
  // An invalid body: the limiter counts it before validation answers 400.
  return call.send({});
}

const forged = (n: number) => ({
  "X-Client-IP": `198.51.100.${n}`,
  "CF-Connecting-IP": `198.51.100.${n + 100}`,
  "X-Real-IP": `203.0.113.${n}`,
});

describe("forged client-IP headers do not dodge the per-IP limit (V-393)", () => {
  const trustProxy = app.get("trust proxy");
  afterEach(() => {
    app.set("trust proxy", trustProxy);
  });

  it("counts every request against the socket address when trust proxy is off", async () => {
    app.set("trust proxy", false);
    const statuses: number[] = [];
    for (let n = 1; n <= CONTACT_LIMIT + 1; n += 1)
      statuses.push((await contact({ ...forged(n), "X-Forwarded-For": `192.0.2.${n}` })).status);

    expect(statuses.slice(0, CONTACT_LIMIT)).not.toContain(429);
    expect(statuses[CONTACT_LIMIT]).toBe(429);
  });

  it("counts against the proxy's forwarded hop, not the client-set headers, when trust proxy is 1", async () => {
    app.set("trust proxy", 1);
    const statuses: number[] = [];
    for (let n = 1; n <= CONTACT_LIMIT + 1; n += 1)
      statuses.push((await contact({ ...forged(n), "X-Forwarded-For": "192.0.2.77" })).status);

    expect(statuses.slice(0, CONTACT_LIMIT)).not.toContain(429);
    expect(statuses[CONTACT_LIMIT]).toBe(429);

    // A different forwarded hop is a different client, so the proxy's header is what counts.
    expect((await contact({ "X-Forwarded-For": "192.0.2.78" })).status).not.toBe(429);
  });
});
