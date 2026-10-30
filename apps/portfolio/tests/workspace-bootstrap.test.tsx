import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_BACKEND_URL = "http://test-backend.local";

const cookieJar = new Map<string, string>();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
    toString: () => [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; "),
  }),
}));

const { loadWorkspaceBootstrap } = await import("@/lib/workspace-bootstrap");
const { default: WorkspaceLayout } = await import("@/app/(platform)/(workspace)/layout");

const user = { name: "Gautam Raj", email: "gautam@veriworkly.com" };
const workspace = {
  draft: null,
  publication: null,
  billing: { canPublish: false, status: "FREE" },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), { status });
}

function stubApi(
  usersMe: () => Response | Promise<Response>,
  portfoliosMe = () => json(workspace),
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/users/me") ? usersMe() : portfoliosMe(),
    ),
  );
}

describe("workspace bootstrap (P-017)", () => {
  beforeEach(() => {
    cookieJar.clear();
    vi.unstubAllGlobals();
  });

  it("renders 'API unavailable' instead of guest mode when /users/me fails with a session", async () => {
    cookieJar.set("veriworkly-auth.session_token", "abc");
    stubApi(() => json(null, 503));

    expect(await loadWorkspaceBootstrap()).toMatchObject({ apiUnavailable: true, user: null });

    const markup = renderToStaticMarkup(
      await WorkspaceLayout({ children: <p>workspace children</p> }),
    );
    expect(markup).toContain("can&#x27;t reach your workspace");
    expect(markup).toContain("Retry");
    expect(markup).not.toContain("workspace children");
  });

  it.each([
    ["a 429", () => json(null, 429)],
    ["a network error", () => Promise.reject(new TypeError("fetch failed"))],
  ])("treats %s as an outage, not a signed-out user", async (_label, usersMe) => {
    cookieJar.set("__Secure-veriworkly-auth.session_token", "abc");
    stubApi(usersMe);

    expect((await loadWorkspaceBootstrap()).apiUnavailable).toBe(true);
  });

  it("never seeds a signed-in user from a blank portfolio when /portfolios/me fails", async () => {
    cookieJar.set("veriworkly-auth.session_token", "abc");
    stubApi(
      () => json(user),
      () => json(null, 500),
    );

    expect((await loadWorkspaceBootstrap()).apiUnavailable).toBe(true);
  });

  it("still opens guest mode when the session is gone (401)", async () => {
    cookieJar.set("veriworkly-auth.session_token", "expired");
    stubApi(() => json(null, 401));

    const bootstrap = await loadWorkspaceBootstrap();
    expect(bootstrap.apiUnavailable).toBeFalsy();
    expect(bootstrap.user).toBeNull();
  });

  it("opens guest mode during an outage when there is no session to lose", async () => {
    stubApi(() => json(null, 503));

    const bootstrap = await loadWorkspaceBootstrap();
    expect(bootstrap.apiUnavailable).toBeFalsy();
    expect(bootstrap.user).toBeNull();
  });

  it("loads a healthy signed-in workspace", async () => {
    cookieJar.set("veriworkly-auth.session_token", "abc");
    stubApi(() => json(user));

    expect(await loadWorkspaceBootstrap()).toEqual({ user, workspace, isAdmin: false });
  });
});
