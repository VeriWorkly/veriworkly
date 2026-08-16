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
