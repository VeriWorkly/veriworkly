import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hoisted: lib/backend reads it when the module loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = "http://test-backend.local";
});

import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { ContentCanvas } from "@/components/dashboard/editor/ContentCanvas";
import { createDefaultPortfolio } from "@/lib/portfolio";
import {
  authenticatedFetch,
  isInvalidSessionResponse,
  setSignedIn,
} from "@/lib/authenticated-fetch";

/** Guests are never thrown to the studio login mid-edit (P-034, P-005). */

function renderCanvas(signedIn: boolean) {
  const initialData = signedIn
    ? {
        user: { name: "Jane", email: "jane@example.com" },
        workspace: {
          draft: {
            id: "doc_1",
            slug: "jane",
            templateId: "signal",
            content: createDefaultPortfolio({ name: "Jane" }),
            revision: 1,
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
          publication: null,
          billing: { canPublish: false, status: "INACTIVE" },
        },
        isAdmin: false,
      }
    : { user: null, workspace: null, isAdmin: false };
  return renderToStaticMarkup(
    <WorkspaceProvider initialData={initialData}>
      <ContentCanvas visibility="block" selectedSectionId="profile" onClose={() => {}} />
    </WorkspaceProvider>,
  );
}

describe("editor controls that need an account", () => {
  it("shows a guest inline login prompts instead of AI and upload controls", () => {
    const markup = renderCanvas(false);
    expect(markup).toContain("Log in to use AI");
    expect(markup).toContain("Log in to upload images");
    expect(markup).not.toContain("Improve with AI");
    expect(markup).not.toContain('type="file"');
  });

  it("shows a signed-in user the real controls", () => {
    const markup = renderCanvas(true);
    expect(markup).toContain("Improve with AI");
    expect(markup).toContain('type="file"');
    expect(markup).not.toContain("Log in to use AI");
  });
});

describe("authenticatedFetch session handling", () => {
  const replace = vi.fn();

  afterEach(() => {
    setSignedIn(false);
    vi.unstubAllGlobals();
    replace.mockReset();
  });

  it("only treats a 401 as an expired session when the tab was signed in", () => {
    expect(isInvalidSessionResponse("/ai/actions", 401, false)).toBe(false);
    expect(isInvalidSessionResponse("/users/me", 404, false)).toBe(false);
    expect(isInvalidSessionResponse("/ai/actions", 401, true)).toBe(true);
    expect(isInvalidSessionResponse("/users/me?x=1", 404, true)).toBe(true);
    expect(isInvalidSessionResponse("/profiles/master", 404, true)).toBe(false);
  });

  it("leaves a guest where they are on a 401", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { href: "http://p.local/editor", replace } });

    const response = await authenticatedFetch("/ai/actions");

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs a signed-in user out and sends them to log in on a 401", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { href: "http://p.local/editor", replace } });
    setSignedIn(true);

    await authenticatedFetch("/ai/actions");

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://test-backend.local/auth/sign-out",
      expect.objectContaining({ method: "POST" }),
    );
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("/login?callbackURL="));
  });

  it("lets the workspace keep unsaved edits before it leaves for the login page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    vi.stubGlobal("window", { location: { href: "http://p.local/editor", replace } });
    // A fresh module: the sign-out above is still memoised in the one already loaded.
    vi.resetModules();
    const fresh = await import("@/lib/authenticated-fetch");
    const order: string[] = [];
    replace.mockImplementation(() => order.push("redirect"));
    fresh.setBeforeSignOut(() => order.push("keep edits"));
    fresh.setSignedIn(true);

    await fresh.authenticatedFetch("/portfolios/draft");

    expect(order).toEqual(["keep edits", "redirect"]);
  });
});
