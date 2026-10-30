import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Publication } from "@/store/portfolio-store";

// Must be set before `@/store/portfolio-store` (and its `@/lib/backend`
// import) is first evaluated, since backendApiUrl reads these into
// module-level consts at import time. Each test re-imports the store fresh
// via vi.resetModules(), so this only needs setting once, up front.
process.env.NEXT_PUBLIC_BACKEND_URL = "http://test-backend.local";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => void store.clear(),
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CACHE_KEY = "veriworkly:portfolio:guest-draft:v5";

const baseContent = {
  schemaVersion: 1 as const,
  templateId: "signal" as const,
  identity: {
    name: "Gautam Raj",
    headline: "",
    bio: "",
    location: "",
    email: "gautam@veriworkly.com",
    availability: "",
    avatar: null,
  },
  seo: { title: "", description: "", socialImage: null },
  socialLinks: [],
  sections: [],
};

describe("portfolio store", () => {
  let createPortfolioStore: typeof import("@/store/portfolio-store").createPortfolioStore;
  let store: ReturnType<typeof createPortfolioStore>;
  let localStorageMock: ReturnType<typeof createMemoryStorage>;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();

    localStorageMock = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: localStorageMock });

    ({ createPortfolioStore } = await import("@/store/portfolio-store"));
    store = createPortfolioStore();
  });

  it("normalizes slug input through updateSlug", () => {
    store.getState().updateSlug("  Gautam Raj!! ");
    expect(store.getState().slug).toBe("gautam-raj");
  });

  it("keeps the newer cloud draft when a stale local guest cache disagrees with it", async () => {
    const localContent = { ...baseContent, identity: { ...baseContent.identity, bio: "local" } };
    const cloudContent = { ...baseContent, identity: { ...baseContent.identity, bio: "cloud" } };

    localStorageMock.setItem(
      CACHE_KEY,
      JSON.stringify({
        slug: "local-slug",
        content: localContent,
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
    );

    const cloudDraft = {
      id: "draft-1",
      slug: "cloud-slug",
      templateId: "signal",
      content: cloudContent,
      revision: 3,
      updatedAt: "2024-06-01T00:00:00.000Z", // newer than the local cache above
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/users/me")) {
          return jsonResponse({ name: "Gautam Raj", email: "gautam@veriworkly.com" });
        }
        if (url.includes("/portfolios/me")) {
          return jsonResponse({ draft: cloudDraft, publication: null, billing: null });
        }
        if (url.includes("/portfolios/analytics")) {
          return jsonResponse(null);
        }
        if (url.includes("/portfolios/draft")) {
          return jsonResponse(cloudDraft);
        }
        return jsonResponse(null, 404);
      }),
    );

    await store.getState().loadWorkspace();

    const state = store.getState();
    expect(state.content.identity.bio).toBe("cloud");
    expect(state.slug).toBe("cloud-slug");
    // The older guest draft lost; it is not offered again on every visit.
    expect(localStorageMock.getItem(CACHE_KEY)).toBeNull();
  });

  it("syncs the local guest draft up when it is provably newer than the cloud draft", async () => {
    const localContent = { ...baseContent, identity: { ...baseContent.identity, bio: "local" } };
    const cloudContent = { ...baseContent, identity: { ...baseContent.identity, bio: "cloud" } };

    localStorageMock.setItem(
      CACHE_KEY,
      JSON.stringify({
        slug: "local-slug",
        content: localContent,
        updatedAt: "2024-06-01T00:00:00.000Z", // newer than the cloud draft below
      }),
    );

    const cloudDraft = {
      id: "draft-1",
      slug: "cloud-slug",
      templateId: "signal",
      content: cloudContent,
      revision: 3,
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    let draftSaveCalled = false;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/users/me")) {
          return jsonResponse({ name: "Gautam Raj", email: "gautam@veriworkly.com" });
        }
        if (url.includes("/portfolios/me")) {
          return jsonResponse({ draft: cloudDraft, publication: null, billing: null });
        }
        if (url.includes("/portfolios/analytics")) {
          return jsonResponse(null);
        }
        if (url.includes("/portfolios/draft")) {
          draftSaveCalled = true;
          return jsonResponse({ ...cloudDraft, content: localContent, slug: "local-slug" });
        }
        return jsonResponse(null, 404);
      }),
    );

    await store.getState().loadWorkspace();

    const state = store.getState();
    expect(state.content.identity.bio).toBe("local");
    expect(state.slug).toBe("local-slug");
    expect(draftSaveCalled).toBe(true);
    await vi.waitFor(() => expect(localStorageMock.getItem(CACHE_KEY)).toBeNull());
  });

  it("carries a guest draft into a new account that has no cloud draft, then forgets it", async () => {
    const guestContent = { ...baseContent, identity: { ...baseContent.identity, bio: "guest" } };
    localStorageMock.setItem(
      CACHE_KEY,
      JSON.stringify({
        slug: "guest-slug",
        content: guestContent,
        updatedAt: "2026-10-30T00:00:00Z",
      }),
    );
    let sentBio = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/users/me")) return jsonResponse({ name: "New User", email: "n@x.com" });
        if (url.includes("/portfolios/me")) {
          return jsonResponse({ draft: null, publication: null, billing: null });
        }
        if (url.includes("/portfolios/draft")) {
          sentBio = JSON.parse(String(init?.body)).snapshot.identity.bio;
          return jsonResponse({
            id: "d1",
            slug: "guest-slug",
            templateId: "signal",
            content: guestContent,
            revision: 1,
            updatedAt: "2026-10-30T00:00:01Z",
          });
        }
        return jsonResponse(null);
      }),
    );

    await store.getState().loadWorkspace();

    expect(store.getState().content.identity.bio).toBe("guest");
    await vi.waitFor(() => expect(localStorageMock.getItem(CACHE_KEY)).toBeNull());
    expect(sentBio).toBe("guest");
  });

  it("never writes a signed-in draft to the browser cache", async () => {
    const signedIn = createPortfolioStore({
      user: { name: "A", email: "a@x.com" },
      ready: true,
      workspaceState: "ready",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          id: "d1",
          slug: "a",
          templateId: "signal",
          content: baseContent,
          revision: 1,
          updatedAt: "2026-10-30T00:00:00Z",
        }),
      ),
    );
    const setItem = vi.spyOn(localStorageMock, "setItem");

    expect((await signedIn.getState().saveDraft()).ok).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  describe("draft saves run one at a time (SV-08)", () => {
    // The 12 s autosave, a manual Save and Publish each call saveDraft. Sent together they carried
    // the same revision, so a server that refuses a stale revision (V-304) would answer the second
    // with a false "changed in another session".
    function signedInStore() {
      return createPortfolioStore({
        user: { name: "Gautam Raj", email: "gautam@veriworkly.com" },
        draft: {
          id: "draft-1",
          slug: "gautam",
          templateId: "signal",
          revision: 1,
          updatedAt: "2026-10-28T00:00:00.000Z",
          content: baseContent,
        } as never,
        content: baseContent,
        slug: "gautam",
        ready: true,
      });
    }

    function deferredSaves() {
      const bodies: Array<{ revision?: number; snapshot: { identity: { bio: string } } }> = [];
      const replies: Array<() => void> = [];
      vi.stubGlobal(
        "fetch",
        vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
          if (!String(input).includes("/portfolios/draft"))
            return Promise.resolve(jsonResponse(null, 404));
          const body = JSON.parse(String(init?.body));
          bodies.push(body);
          return new Promise<Response>((resolve) => {
            replies.push(() =>
              resolve(
                jsonResponse({
                  id: "draft-1",
                  slug: "gautam",
                  templateId: "signal",
                  revision: (body.revision ?? 0) + 1,
                  updatedAt: "2026-10-28T00:00:01.000Z",
                  content: body.snapshot,
                }),
              ),
            );
          });
        }),
      );
      return { bodies, replies };
    }

    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    it("sends a save asked for mid-flight after the first returns, with the new revision", async () => {
      const saving = signedInStore();
      const { bodies, replies } = deferredSaves();

      const autosave = saving.getState().saveDraft();
      saving.getState().updateIdentity({ bio: "edited mid-flight" });
      const manual = saving.getState().saveDraft();
      await settle();
      expect(bodies).toHaveLength(1);

      replies[0]();
      await autosave;
      await settle();
      expect(bodies).toHaveLength(2);
      expect(bodies[1].revision).toBe(2);
      expect(bodies[1].snapshot.identity.bio).toBe("edited mid-flight");

      replies[1]();
      await expect(manual).resolves.toMatchObject({ ok: true, draft: { revision: 3 } });
      expect(saving.getState().draft?.revision).toBe(3);
      expect(saving.getState().isDirty).toBe(false);
    });

    it("folds every save asked for during one flight into a single follow-up", async () => {
      const saving = signedInStore();
      const { bodies, replies } = deferredSaves();

      const first = saving.getState().saveDraft();
      const second = saving.getState().saveDraft();
      const third = saving.getState().saveDraft();
      replies[0]();
      await first;
      await settle();
      replies[1]();

      const [a, b] = await Promise.all([second, third]);
      expect(bodies).toHaveLength(2);
      expect(a).toBe(b);
    });

    it("keeps an edit made during a save marked unsaved", async () => {
      const saving = signedInStore();
      const { replies } = deferredSaves();

      const autosave = saving.getState().saveDraft();
      await settle();
      saving.getState().updateIdentity({ bio: "typed while saving" });
      replies[0]();
      await autosave;

      expect(saving.getState().isDirty).toBe(true);
      expect(saving.getState().status).toBe("Unsaved changes");
    });
  });

  it("shares a single in-flight load across concurrent loadWorkspace() calls", async () => {
    let usersMeCallCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/users/me")) {
          usersMeCallCount += 1;
          return jsonResponse(null, 401);
        }
        return jsonResponse(null, 404);
      }),
    );

    const first = store.getState().loadWorkspace();
    const second = store.getState().loadWorkspace();

    await Promise.all([first, second]);

    expect(usersMeCallCount).toBe(1);
  });

  it("gracefully falls back to guest mode on 401 response without cloud sync", async () => {
    const localContent = {
      ...baseContent,
      identity: { ...baseContent.identity, bio: "guest-bio" },
    };
    localStorageMock.setItem(
      CACHE_KEY,
      JSON.stringify({
        slug: "guest-portfolio",
        content: localContent,
        updatedAt: "2024-06-01T00:00:00.000Z",
      }),
    );

    let draftSyncAttempted = false;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/users/me")) {
          return jsonResponse({ message: "Unauthorized" }, 401);
        }
        if (url.includes("/portfolios/draft")) {
          draftSyncAttempted = true;
          return jsonResponse({ message: "Unauthorized" }, 401);
        }
        return jsonResponse(null, 404);
      }),
    );

    await store.getState().loadWorkspace();

    const state = store.getState();
    expect(state.ready).toBe(true);
    expect(state.user).toBeNull();
    expect(state.content.identity.bio).toBe("guest-bio");
    expect(state.slug).toBe("guest-portfolio");
    expect(state.status).toBe("Saved");
    expect(draftSyncAttempted).toBe(false);
  });

  it("blocks publication for unauthenticated guest users", async () => {
    let publishApiCalled = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/portfolios/publish")) {
          publishApiCalled = true;
          return jsonResponse({});
        }
        return jsonResponse(null, 200);
      }),
    );

    const result = await store.getState().publish();

    expect(result).toEqual({ ok: false, message: "Please log in to publish your portfolio." });
    expect(publishApiCalled).toBe(false);
  });

  describe("an API outage never drops a signed-in user to guest mode (P-017)", () => {
    it("shows the workspace as failed, not guest, when /users/me answers 5xx", async () => {
      const cachedRaw = JSON.stringify({
        slug: "cached",
        content: { ...baseContent, identity: { ...baseContent.identity, bio: "cached-bio" } },
        updatedAt: "2026-10-01T00:00:00.000Z",
      });
      localStorageMock.setItem(CACHE_KEY, cachedRaw);
      const setItem = vi.spyOn(localStorageMock, "setItem");
      const calls: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          calls.push(String(input));
          if (String(input).includes("/users/me")) return jsonResponse(null, 503);
          return jsonResponse({ draft: null, publication: null, billing: null });
        }),
      );

      await store.getState().loadWorkspace();

      const state = store.getState();
      expect(state.workspaceState).toBe("error");
      expect(state.status).toBe("Offline");
      expect(calls.some((url) => url.includes("/portfolios/me"))).toBe(false);

      // An edit and an autosave in this state must neither save as a guest nor touch the cache.
      state.updateIdentity({ bio: "typed during the outage" });
      const saved = await store.getState().saveDraft();
      expect(saved.ok).toBe(false);
      expect(setItem).not.toHaveBeenCalled();
      expect(localStorageMock.getItem(CACHE_KEY)).toBe(cachedRaw);
    });
  });

  describe("save, publish and unpublish report what really happened (P-018, P-026)", () => {
    const savedDraft = {
      id: "draft-1",
      slug: "gautam",
      templateId: "signal",
      revision: 2,
      updatedAt: "2026-10-28T00:00:01.000Z",
      content: baseContent,
    };

    function signedIn(publication: Publication = null) {
      return createPortfolioStore({
        user: { name: "Gautam Raj", email: "gautam@veriworkly.com" },
        draft: { ...savedDraft, revision: 1 } as never,
        content: baseContent,
        slug: "gautam",
        publication,
        ready: true,
        workspaceState: "ready",
      });
    }

    function stubApi(routes: Record<string, () => Response>) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          const route = Object.keys(routes).find((path) => url.includes(path));
          return route ? routes[route]() : jsonResponse(null, 404);
        }),
      );
    }

    const errorResponse = (status: number, body: object) =>
      new Response(JSON.stringify(body), { status });

    it.each([
      [402, 'Publishing the premium template "Nimbus" requires Creator Pro.'],
      [403, "This portfolio was taken down by a moderator."],
      [409, "That portfolio subdomain is already in use."],
    ])("returns the server's message for a %i publish, not a success", async (status, message) => {
      const publishing = signedIn();
      stubApi({
        "/portfolios/draft": () => jsonResponse(savedDraft),
        "/portfolios/publish": () => errorResponse(status, { message }),
      });

      const result = await publishing.getState().publish();

      expect(result).toEqual({ ok: false, status, message });
      expect(publishing.getState().publication).toBeNull();
    });

    it("includes the field messages of a 400 publish", async () => {
      const publishing = signedIn();
      stubApi({
        "/portfolios/draft": () => jsonResponse(savedDraft),
        "/portfolios/publish": () =>
          errorResponse(400, {
            message: "Validation failed.",
            details: [{ path: "identity.bio", message: "Add a short bio." }],
          }),
      });

      const result = await publishing.getState().publish();

      expect(result).toEqual({
        ok: false,
        status: 400,
        message: "Validation failed. Add a short bio.",
      });
    });

    it("does not publish when the save before it fails", async () => {
      const publishing = signedIn();
      let publishCalled = false;
      stubApi({
        "/portfolios/draft": () => errorResponse(500, { message: "Database unavailable." }),
        "/portfolios/publish": () => {
          publishCalled = true;
          return jsonResponse({});
        },
      });

      const result = await publishing.getState().publish();

      expect(result.ok).toBe(false);
      expect(result.message).toContain("Database unavailable.");
      expect(publishCalled).toBe(false);
    });

    it("reports a republished site as live and no longer offline", async () => {
      const publishing = signedIn({
        subdomain: "gautam",
        status: "SUSPENDED",
        offlineReason: "owner",
      });
      stubApi({
        "/portfolios/draft": () => jsonResponse(savedDraft),
        "/portfolios/publish": () =>
          jsonResponse({ subdomain: "gautam", publicUrl: "https://gautam.veriworkly.com" }),
      });

      const result = await publishing.getState().publish();

      expect(result.ok).toBe(true);
      expect(publishing.getState().publication).toEqual({
        subdomain: "gautam",
        status: "LIVE",
        offlineReason: null,
      });
    });

    it("tells a stale draft apart from a refused one on save", async () => {
      const stale = signedIn();
      stubApi({
        "/portfolios/draft": () =>
          errorResponse(409, {
            message: "Portfolio draft changed in another session.",
            details: { revision: 5 },
          }),
      });
      const staleResult = await stale.getState().saveDraft();
      expect(staleResult).toMatchObject({ ok: false, status: 409 });
      expect(staleResult.message).toMatch(/Refresh/);
      expect(stale.getState().status).toBe("Conflict");

      const refused = signedIn();
      stubApi({
        "/portfolios/draft": () => errorResponse(400, { message: "Choose a valid subdomain." }),
      });
      expect(await refused.getState().saveDraft()).toEqual({
        ok: false,
        status: 400,
        message: "Choose a valid subdomain.",
      });
    });

    it("takes a live site offline", async () => {
      const live = signedIn({ subdomain: "gautam", status: "LIVE" });
      stubApi({ "/portfolios/unpublish": () => jsonResponse({ status: "SUSPENDED" }) });

      const result = await live.getState().unpublish();

      expect(result.ok).toBe(true);
      expect(live.getState().publication?.status).toBe("SUSPENDED");
      // The status card then says the owner took it offline and offers Republish.
      expect(live.getState().publication?.offlineReason).toBe("owner");
    });

    it("treats a 404 unpublish as already offline", async () => {
      const live = signedIn({ subdomain: "gautam", status: "LIVE" });
      stubApi({
        "/portfolios/unpublish": () =>
          errorResponse(404, { message: "Portfolio is not published." }),
      });

      const result = await live.getState().unpublish();

      expect(result.ok).toBe(true);
      expect(live.getState().publication?.status).toBe("SUSPENDED");
    });

    it("keeps the site shown as live when unpublish fails", async () => {
      const live = signedIn({ subdomain: "gautam", status: "LIVE" });
      stubApi({
        "/portfolios/unpublish": () => errorResponse(500, { message: "Something went wrong." }),
      });

      const result = await live.getState().unpublish();

      expect(result).toEqual({ ok: false, status: 500, message: "Something went wrong." });
      expect(live.getState().publication?.status).toBe("LIVE");
    });
  });
});

describe("hydration keeps what the dashboard needs", () => {
  it("keeps the server's offlineReason and never defaults to a reserved subdomain", async () => {
    const { buildHydratedState } = await import("@/store/portfolio-store");

    const state = buildHydratedState({
      user: { name: "Designer", email: "d@example.com" },
      workspace: {
        draft: undefined,
        publication: { subdomain: "old", status: "SUSPENDED", offlineReason: "moderation" },
        billing: { canPublish: false, status: "INACTIVE" },
      },
      analytics: null,
    });

    expect(state.publication?.offlineReason).toBe("moderation");
    // "designer" is reserved: every save of it used to fail with a 400 (P-023).
    expect(state.slug).toBe("designer-portfolio");
  });
});
