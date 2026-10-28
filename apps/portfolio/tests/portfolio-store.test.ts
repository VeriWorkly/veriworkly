import { beforeEach, describe, expect, it, vi } from "vitest";

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
      "veriworkly:portfolio:draft-cache:v4",
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
  });

  it("syncs the local guest draft up when it is provably newer than the cloud draft", async () => {
    const localContent = { ...baseContent, identity: { ...baseContent.identity, bio: "local" } };
    const cloudContent = { ...baseContent, identity: { ...baseContent.identity, bio: "cloud" } };

    localStorageMock.setItem(
      "veriworkly:portfolio:draft-cache:v4",
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
      await expect(manual).resolves.toMatchObject({ revision: 3 });
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
      "veriworkly:portfolio:draft-cache:v4",
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

    await store.getState().publish();

    const state = store.getState();
    expect(state.message).toBe("Please log in to publish your portfolio.");
    expect(publishApiCalled).toBe(false);
  });
});
