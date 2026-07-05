import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getRequestIpDetails } from "../../src/utils/requestIp.js";

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

  it("prioritizes headers in proper precedence order", () => {
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
