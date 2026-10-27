import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  getGuestLandingPath,
  getSafeAuthCallback,
  isProtectedStudioPath,
} from "@/lib/auth-redirect";
import { isInvalidSessionResponse } from "@/lib/invalid-session";
import proxy from "@/proxy";
import { describeSignInError, signInFailureFromQuery, signInHref } from "@/lib/sign-in";
import { siteConfig } from "@/config/site";

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

  it("redirects anonymous Studio visits without guest mode to login", async () => {
    const response = await proxy(new NextRequest("https://studio.veriworkly.com/documents"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://studio.veriworkly.com/login?callbackURL=%2Fdocuments",
    );
  });

  it("permits access to Studio routes when guest cookie is present", async () => {
    const request = new NextRequest("https://studio.veriworkly.com/documents", {
      headers: { cookie: "veriworkly-guest-mode=true" },
    });
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("permits access to Studio routes when session cookie is present", async () => {
    const request = new NextRequest("https://studio.veriworkly.com/documents", {
      headers: { cookie: "veriworkly-auth.session_token=valid-session" },
    });
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("redirects anonymous protected routes to login with their return location even with guest cookie", async () => {
    const response = await proxy(
      new NextRequest("https://studio.veriworkly.com/profile/master?section=basics", {
        headers: { cookie: "veriworkly-guest-mode=true" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://studio.veriworkly.com/login?callbackURL=%2Fprofile%2Fmaster%3Fsection%3Dbasics",
    );
  });

  it("bypasses share and api routes without cookies", async () => {
    const shareResponse = await proxy(
      new NextRequest("https://studio.veriworkly.com/share/doc-123"),
    );
    expect(shareResponse.status).toBe(200);

    const apiResponse = await proxy(new NextRequest("https://studio.veriworkly.com/api/health"));
    expect(apiResponse.status).toBe(200);
  });

  it("redirects authenticated visitors away from login page", async () => {
    const request = new NextRequest(
      "https://studio.veriworkly.com/login?callbackURL=%2Fdocuments",
      {
        headers: { cookie: "veriworkly-auth.session_token=valid-session" },
      },
    );
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://studio.veriworkly.com/documents");
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

  it("S-040: lets a signed-in social sign-in reach /login/callback so it can finish", async () => {
    const response = await proxy(
      new NextRequest("https://studio.veriworkly.com/login/callback?callbackURL=%2F&ref=FRIEND", {
        headers: { cookie: "veriworkly-auth.session_token=valid-session" },
      }),
    );

    expect(response.status).toBe(200);
  });

  it("S-045: /api-keys is not an /api route and still needs a session or guest mode", async () => {
    for (const path of ["/api-keys", "/api-keys/create", "/shared-thing", "/parityx"]) {
      const response = await proxy(new NextRequest(`https://studio.veriworkly.com${path}`));

      expect(response.status, path).toBe(307);
    }
  });

  it("S-038: a dotted last segment does not skip the login redirect", async () => {
    for (const path of ["/admin/users/jane.doe", "/profile/master.json", "/documents/a.b"]) {
      const response = await proxy(new NextRequest(`https://studio.veriworkly.com${path}`));

      expect(response.status, path).toBe(307);
    }
  });

  it("S-038: public machine-readable files stay reachable without cookies", async () => {
    for (const path of [
      "/llms.txt",
      "/openapi.json",
      "/robots.txt",
      "/sitemap.xml",
      "/manifest.json",
      "/.well-known/security.txt",
      "/api/health",
      "/share/jane/resume",
      "/parity/resume",
    ]) {
      const response = await proxy(new NextRequest(`https://studio.veriworkly.com${path}`));

      expect(response.status, path).toBe(200);
    }
  });

  it("S-139: the session-expired login page is not bounced while a stale cookie lingers", async () => {
    const response = await proxy(
      new NextRequest("https://studio.veriworkly.com/login?session=expired", {
        headers: { cookie: "veriworkly-auth.session_token=revoked" },
      }),
    );

    expect(response.status).toBe(200);
  });

  it("S-139: the session-expired route is reachable without a guest cookie and never a sign-in target", async () => {
    const response = await proxy(
      new NextRequest("https://studio.veriworkly.com/auth/session-expired"),
    );

    expect(response.status).toBe(200);
    expect(getSafeAuthCallback("/auth/session-expired")).toBe("/");
    expect(getSafeAuthCallback("/auth/session-expired?x=1")).toBe("/");
  });

  it("S-040: getSafeAuthCallback rejects backslash, tab and untrusted absolute callbacks", () => {
    expect(getSafeAuthCallback("/\\evil.com")).toBe("/");
    expect(getSafeAuthCallback("/\t/evil.com")).toBe("/");
    expect(getSafeAuthCallback("/\t\\evil.com")).toBe("/");
    expect(getSafeAuthCallback("http://app.veriworkly.com/x")).toBe("/");
    expect(getSafeAuthCallback("https://evil.com/x")).toBe("/");
    expect(getSafeAuthCallback("javascript:alert(1)")).toBe("/");
  });

  it("S-200: a 401 from a public share never signs the viewer out", () => {
    expect(isInvalidSessionResponse("/shares/public/jane/resume", 401)).toBe(false);
    expect(isInvalidSessionResponse("/shares/public/jane/resume/verify?x=1", 401)).toBe(false);
    expect(isInvalidSessionResponse("/shares", 401)).toBe(true);
  });
});

describe("sign-in from anywhere (Phase 9 Part D)", () => {
  it("S-324 a failed social sign-in says what happened, from the code alone", () => {
    expect(describeSignInError("account_not_linked").message).toMatch(
      /already has a VeriWorkly account/,
    );
    expect(describeSignInError("access_denied")).toEqual({
      tone: "info",
      message: "Sign in was cancelled.",
    });
    expect(describeSignInError("made_up").message).toBe("Sign in failed. Please try again.");
  });

  it("S-324 the free-text error_description in the link is never shown", () => {
    const params = new URLSearchParams({
      error: "internal_server_error",
      error_description: "Call +1 555 0100 to restore your account",
    });

    expect(signInFailureFromQuery(params)).toEqual({
      tone: "error",
      message: "Sign in failed. Please try again.",
    });
    expect(signInFailureFromQuery(new URLSearchParams())).toBeNull();
  });

  it("S-352 a GitHub account with another email is refused in words that say so", () => {
    expect(describeSignInError("email_doesn't_match").message).toBe(
      "This server still requires the same email on both accounts.",
    );
  });

  it("S-321 an absolute studio URL to a protected page is not a guest landing", () => {
    const app = new URL(siteConfig.links.app).origin;

    expect(getGuestLandingPath(`${app}/profile/master`)).toBe("/");
    expect(getGuestLandingPath(`${app}/documents`)).toBe(`${app}/documents`);
  });

  it("S-350 sign-in prompts come back to the page they were opened on", () => {
    vi.stubGlobal("window", { location: { pathname: "/editor/resume/r1", search: "?tab=2" } });

    expect(signInHref()).toBe(
      `/login?callbackURL=${encodeURIComponent("/editor/resume/r1?tab=2")}`,
    );

    for (const file of [
      "components/modals/ShareDocumentModal.tsx",
      "components/dashboard/modals/ImportProfileModal.tsx",
      "components/dashboard/account-menu/AccountMenu.tsx",
    ]) {
      const source = readFileSync(join(__dirname, "..", "..", file), "utf8");

      expect(source, file).toContain("signInHref()");
      expect(source, file).not.toMatch(/<Link href="\/login">|push\("\/login"\)\}?>\s*Sign in/);
    }
  });

  it("S-352 an email-code user can link GitHub, and a refused link lands where it is explained", async () => {
    const linkSocial = vi.fn(async () => ({ data: { url: "https://github.com" }, error: null }));
    vi.doMock("@/lib/auth-client", () => ({ authClient: { linkSocial } }));
    vi.stubGlobal("window", { location: { pathname: "/documents", search: "" } });
    vi.resetModules();

    const { linkGithubAccount } = await import("@/lib/sign-in");
    await linkGithubAccount();

    expect(linkSocial).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "github",
        callbackURL: expect.stringMatching(/\/documents$/),
        errorCallbackURL: expect.stringMatching(/\/profile$/),
      }),
    );
    vi.doUnmock("@/lib/auth-client");
  });
});

describe("account pages after a redirect (Phase 9 Part D)", () => {
  const read = (file: string) => readFileSync(join(__dirname, "..", "..", file), "utf8");

  it("S-352 a refused GitHub link is explained on the profile page it lands on", () => {
    expect(read("app/(main)/(dashboard)/profile/page.tsx")).toContain("<LinkErrorNotice />");
    expect(read("features/profile/components/LinkErrorNotice.tsx")).toContain(
      "signInFailureFromQuery(searchParams)",
    );
  });

  it("O7 LOW a late availability reply cannot decide a username the user has since changed", () => {
    const source = read("features/profile/components/EditProfileUsernameModal.tsx");

    expect(source).toMatch(/if \(!current\) return;/);
  });
});

describe("GitHub linking (owner decision A)", () => {
  const read = (file: string) => readFileSync(join(__dirname, "..", "..", file), "utf8");

  it("server refusals read as plain text, an old server's email rule included", () => {
    expect(describeSignInError("email_doesn't_match").message).toBe(
      "This server still requires the same email on both accounts.",
    );
    expect(describeSignInError("github_already_linked").message).toMatch(
      /already linked to a different GitHub account/,
    );
    expect(describeSignInError("unlink_not_allowed").message).toBe(
      "A linked GitHub account can't be removed.",
    );
    expect(describeSignInError("some_new_code").message).toBe("Sign in failed. Please try again.");
  });

  it("the server's own GitHub codes, as its redirect sends them, read as plain text", () => {
    const server = readFileSync(
      join(__dirname, "..", "..", "..", "server", "src", "auth", "githubLinking.ts"),
      "utf8",
    );
    const code = (name: string) =>
      server.match(new RegExp(`export const ${name} = "([^"]+)"`))?.[1] ?? "";

    expect(code("GITHUB_ALREADY_LINKED")).not.toBe("");
    expect(code("GITHUB_UNLINK_FORBIDDEN")).not.toBe("");

    const alreadyLinked = signInFailureFromQuery(
      new URLSearchParams({ error: code("GITHUB_ALREADY_LINKED") }),
    );
    expect(alreadyLinked?.message).toMatch(/already linked to a different GitHub account/);
    expect(describeSignInError(code("GITHUB_UNLINK_FORBIDDEN")).message).toBe(
      "A linked GitHub account can't be removed.",
    );
  });

  it("a code the link call returns is mapped; without one its message is shown", async () => {
    const linkSocial = vi
      .fn()
      .mockResolvedValueOnce({ error: { code: "GITHUB_ALREADY_LINKED", message: "raw" } })
      .mockResolvedValueOnce({ error: { message: "Provider not configured" } });
    vi.doMock("@/lib/auth-client", () => ({ authClient: { linkSocial } }));
    vi.stubGlobal("window", { location: { pathname: "/documents", search: "" } });
    vi.resetModules();
    const { linkGithubAccount } = await import("@/lib/sign-in");

    await expect(linkGithubAccount()).rejects.toThrow(
      /already linked to a different GitHub account/,
    );
    await expect(linkGithubAccount()).rejects.toThrow("Provider not configured");
    vi.doUnmock("@/lib/auth-client");
  });

  it("the studio offers no way to disconnect GitHub", () => {
    for (const file of [
      "components/dashboard/modals/ImportProfileModal.tsx",
      "lib/sign-in.ts",
      "features/profile/components/ProfileDataPanel.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/unlinkAccount|Disconnect GitHub/);
    }
  });
});
