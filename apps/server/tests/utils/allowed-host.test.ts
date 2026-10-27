import { describe, expect, it } from "vitest";

import { isAllowedHost } from "../../src/utils/requestOrigin.js";

/** V-155: the auth routes answer only to this API's own host names. */
describe("isAllowedHost", () => {
  const allowed = {
    baseUrl: "https://api.veriworkly.com",
    extraHosts: ["api-staging.veriworkly.com"],
  };
  const check = (host: string | undefined) => isAllowedHost({ host }, allowed);

  it("accepts the base URL's host with or without a port, loopback and the extra list", () => {
    expect(check("api.veriworkly.com")).toBe(true);
    expect(check("API.VeriWorkly.com:443")).toBe(true);
    expect(check("localhost:7042")).toBe(true);
    expect(check("127.0.0.1")).toBe(true);
    expect(check("api-staging.veriworkly.com")).toBe(true);
  });

  it("refuses anything else, and a missing Host", () => {
    expect(check("evil.example")).toBe(false);
    expect(check("api.veriworkly.com.evil.example")).toBe(false);
    expect(check(undefined)).toBe(false);
  });
});
