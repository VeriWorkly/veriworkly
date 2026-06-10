import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { getSafeAuthCallback } from "@/lib/auth-redirect";
import { isInvalidSessionResponse } from "@/lib/invalid-session";
import proxy, { isProtectedStudioPath } from "@/proxy";

describe("auth redirect contract", () => {
  it("keeps only account-sensitive Studio routes protected", () => {
    expect(isProtectedStudioPath("/admin")).toBe(true);
    expect(isProtectedStudioPath("/admin/roadmap")).toBe(true);
    expect(isProtectedStudioPath("/profile/master")).toBe(true);
    expect(isProtectedStudioPath("/profile/advanced")).toBe(true);
  });

  it("keeps local-first and future Studio routes guest-accessible by default", () => {
    expect(isProtectedStudioPath("/")).toBe(false);
    expect(isProtectedStudioPath("/documents")).toBe(false);
    expect(isProtectedStudioPath("/editor/resume/local-id")).toBe(false);
    expect(isProtectedStudioPath("/profile")).toBe(false);
    expect(isProtectedStudioPath("/api-keys")).toBe(false);
    expect(isProtectedStudioPath("/future-local-first-page")).toBe(false);
  });

  it("automatically starts guest mode on an anonymous Studio visit", async () => {
    const response = await proxy(new NextRequest("https://studio.veriworkly.com/documents"));

    expect(response.status).toBe(200);
    expect(response.cookies.get("veriworkly-guest-mode")?.value).toBe("true");
    expect(response.cookies.get("veriworkly-guest-mode")?.httpOnly).toBe(true);
  });

  it("redirects anonymous protected routes to login with their return location", async () => {
    const response = await proxy(
      new NextRequest("https://studio.veriworkly.com/profile/master?section=basics"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://studio.veriworkly.com/login?callbackURL=%2Fprofile%2Fmaster%3Fsection%3Dbasics",
    );
  });

  it("accepts trusted return locations and rejects open redirects", () => {
    expect(getSafeAuthCallback("/documents?view=grid")).toBe("/documents?view=grid");
    expect(getSafeAuthCallback("https://portfolio.veriworkly.com/editor")).toBe(
      "https://portfolio.veriworkly.com/editor",
    );
    expect(getSafeAuthCallback("https://example.com/steal")).toBe("/");
    expect(getSafeAuthCallback("//example.com/steal")).toBe("/");
  });

  it("clears invalid sessions without treating ordinary missing resources as auth failures", () => {
    expect(isInvalidSessionResponse("/documents/missing", 401)).toBe(true);
    expect(isInvalidSessionResponse("/users/me", 404)).toBe(true);
    expect(isInvalidSessionResponse("/documents/missing", 404)).toBe(false);
  });
});
