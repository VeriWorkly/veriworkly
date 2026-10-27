import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { addressBucket, getRequestIpDetails } from "../../src/utils/requestIp.js";

describe("requestIp utility", () => {
  it("normalizes localhost and loopback IPv6 / IPv4 addresses to 127.0.0.1", () => {
    const mockReq = (ip: string) =>
      ({
        ip,
        headers: {},
        socket: { remoteAddress: "127.0.0.1" },
      }) as unknown as Request;

    expect(getRequestIpDetails(mockReq("::1")).resolvedIp).toBe("127.0.0.1");
    expect(getRequestIpDetails(mockReq("::")).resolvedIp).toBe("127.0.0.1");
    expect(getRequestIpDetails(mockReq("0:0:0:0:0:0:0:1")).resolvedIp).toBe("127.0.0.1");
    expect(getRequestIpDetails(mockReq("0:0:0:0:0:0:0:0")).resolvedIp).toBe("127.0.0.1");
    expect(getRequestIpDetails(mockReq("127.0.0.1")).resolvedIp).toBe("127.0.0.1");
  });

  it("extracts and strips ::ffff: prefix from IPv4-mapped IPv6 addresses", () => {
    const mockReq = {
      ip: "::ffff:192.168.1.100",
      headers: {},
      socket: {},
    } as unknown as Request;

    const details = getRequestIpDetails(mockReq);
    expect(details.resolvedIp).toBe("192.168.1.100");
  });

  it("without an Express app (no req.app), falls back to the headers in precedence order", () => {
    const mockReq = {
      ip: undefined,
      headers: {
        "x-client-ip": "1.1.1.1",
        "x-forwarded-for": "2.2.2.2, 3.3.3.3",
        "x-real-ip": "4.4.4.4",
        "cf-connecting-ip": "5.5.5.5",
      },
      socket: { remoteAddress: "6.6.6.6" },
    } as unknown as Request;

    const details = getRequestIpDetails(mockReq);
    // clientIpHeader has priority over forwardedForCandidate, realIp, cfConnectingIp, and socketIp
    expect(details.resolvedIp).toBe("1.1.1.1");
    expect(details.forwardedForCandidate).toBe("2.2.2.2");
  });

  it("handles remote socket address fallback when headers and ip are empty", () => {
    const mockReq = {
      headers: {},
      socket: { remoteAddress: "8.8.8.8" },
    } as unknown as Request;

    const details = getRequestIpDetails(mockReq);
    expect(details.resolvedIp).toBe("8.8.8.8");
  });

  it("handles undefined socket safely and falls back to unknown", () => {
    const mockReq = {
      headers: {},
    } as unknown as Request;

    const details = getRequestIpDetails(mockReq);
    expect(details.resolvedIp).toBe("unknown");
    expect(details.socketIp).toBe("unknown");
  });

  it("does not corrupt normal IPv6 addresses that contain zero digits", () => {
    const normalIpv6 = "2001:db8:0:1::1";
    const mockReq = {
      ip: normalIpv6,
      headers: {},
      socket: {},
    } as unknown as Request;

    const details = getRequestIpDetails(mockReq);
    expect(details.resolvedIp).toBe(normalIpv6);
  });
});

// One home connection holds a whole IPv6 /64 and can move within it, so the anonymous quota
// counted by single IPv6 addresses counted nothing.
describe("addressBucket", () => {
  it("keeps an IPv4 address whole and counts an IPv6 address by its /64", () => {
    expect(addressBucket("203.0.113.7")).toBe("203.0.113.7");
    expect(addressBucket("2001:db8:abcd:12:1111:2222:3333:4444")).toBe("2001:db8:abcd:12::/64");
    expect(addressBucket("2001:db8:abcd:12:ffff::1")).toBe("2001:db8:abcd:12::/64");
    expect(addressBucket("2001:DB8:0:0::5")).toBe("2001:db8:0:0::/64");
    expect(addressBucket("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(addressBucket("fe80::1")).toBe("fe80:0:0:0::/64");
  });

  it("computes the details once per request", () => {
    const req = {
      ip: "203.0.113.7",
      headers: {},
      socket: { remoteAddress: "10.0.0.1" },
      app: { get: () => 1 },
    } as unknown as Request;

    const first = getRequestIpDetails(req);
    (req as unknown as { ip: string }).ip = "198.51.100.9";

    expect(getRequestIpDetails(req)).toBe(first);
    expect(first.resolvedIp).toBe("203.0.113.7");
  });
});

/**
 * V-393: the cases above build requests with no `req.app`, a branch real Express requests never
 * take. These go through a real `express()` app, as production does.
 */
describe("getRequestIpDetails on real Express requests", () => {
  async function resolvedIpWith(trustProxy: boolean | number, headers: Record<string, string>) {
    const { default: express } = await import("express");
    const { default: request } = await import("supertest");
    const app = express();
    app.set("trust proxy", trustProxy);
    app.get("/", (req, res) => {
      res.json(getRequestIpDetails(req));
    });
    const call = request(app).get("/");
    for (const [name, value] of Object.entries(headers)) call.set(name, value);
    return (await call).body.resolvedIp as string;
  }

  const forged = {
    "x-client-ip": "198.51.100.1",
    "cf-connecting-ip": "198.51.100.2",
    "x-real-ip": "198.51.100.3",
  };

  it("uses the socket address and ignores every forwarding header when trust proxy is off", async () => {
    expect(await resolvedIpWith(false, { ...forged, "x-forwarded-for": "192.0.2.9" })).toBe(
      "127.0.0.1",
    );
  });

  it("uses the trusted proxy's X-Forwarded-For hop, never the client-set headers, when trust proxy is 1", async () => {
    expect(
      await resolvedIpWith(1, { ...forged, "x-forwarded-for": "203.0.113.50, 192.0.2.9" }),
    ).toBe("192.0.2.9");
  });
});
