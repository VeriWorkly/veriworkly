import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Publication } from "@/store/portfolio-store";
import { createDefaultPortfolio } from "@/lib/portfolio";

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
  let shouldAutosave: typeof import("@/store/portfolio-store").shouldAutosave;
  let saveStatusLabel: typeof import("@/store/portfolio-store").saveStatusLabel;
  let warnOnLeave: typeof import("@/store/portfolio-store").warnOnLeave;
  let store: ReturnType<typeof createPortfolioStore>;
  let localStorageMock: ReturnType<typeof createMemoryStorage>;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();

    localStorageMock = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: localStorageMock });

    ({ createPortfolioStore, shouldAutosave, saveStatusLabel, warnOnLeave } =
      await import("@/store/portfolio-store"));
    store = createPortfolioStore();
  });

  describe("leaving with unsaved edits (P-022)", () => {
    it("asks a signed-in owner first, from any workspace page", () => {
      const state = {
        ...store.getState(),
        user: { name: "Gautam Raj" },
        workspaceState: "ready" as const,
        isDirty: true,
      };
      expect(warnOnLeave(state)).toBe(true);
      expect(warnOnLeave({ ...state, isDirty: false })).toBe(false);
    });

    it("never holds up a guest: their draft is written to this browser instead", () => {
      const state = {
        ...store.getState(),
        user: null,
        workspaceState: "ready" as const,
        isDirty: true,
      };
      state.content = {
        ...state.content,
        identity: { ...state.content.identity, bio: "guest edit" },
      };

      expect(warnOnLeave(state)).toBe(false);
      expect(JSON.parse(localStorageMock.getItem(CACHE_KEY) ?? "{}").content.identity.bio).toBe(
        "guest edit",
      );
    });
  });

  it("stops adding sections at the server's cap of 24 (P-025)", () => {
    store.setState({ ready: true });
    for (let i = 0; i < 30; i++) store.getState().addSection("projects");
    expect(store.getState().content.sections).toHaveLength(24);
  });

  it("starts a project detail page with that project in it, not an empty shell", () => {
    store.setState({ ready: true });
    const section = {
      id: "s1",
      type: "projects" as const,
      title: "Atlas",
      visible: true,
      items: [{ id: "p1", title: "Atlas" }],
    };

    store.getState().addPage("work/atlas", "Atlas", [section]);

    expect(store.getState().content.pages?.[0]).toMatchObject({
      slug: "work/atlas",
      title: "Atlas",
      sections: [section],
    });
  });

  it("normalizes slug input through updateSlug", () => {
    store.getState().updateSlug("  Gautam Raj!! ");
    expect(store.getState().slug).toBe("gautam-raj");
  });

  // S2: a guest draft left in a shared browser may belong to someone else. Signing in never
  // carries it into the account unasked; the owner brings it in or discards it.
  describe("a guest draft found after signing in", () => {
    const localContent = { ...baseContent, identity: { ...baseContent.identity, bio: "local" } };
    const cloudContent = { ...baseContent, identity: { ...baseContent.identity, bio: "cloud" } };
    const cloudDraft = {
      id: "draft-1",
      slug: "cloud-slug",
      templateId: "signal",
      content: cloudContent,
      revision: 3,
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    let sentBodies: Array<{ subdomain: string; snapshot: typeof baseContent }>;

    function signIn(cloud: typeof cloudDraft | null) {
      sentBodies = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.includes("/users/me")) {
            return jsonResponse({ name: "Gautam Raj", email: "gautam@veriworkly.com" });
          }
          if (url.includes("/portfolios/me")) {
            return jsonResponse({ draft: cloud, publication: null, billing: null });
          }
          if (url.includes("/portfolios/analytics")) return jsonResponse(null);
          if (url.includes("/portfolios/draft")) {
            const body = JSON.parse(String(init?.body));
            sentBodies.push(body);
            return jsonResponse({
              ...(cloud ?? cloudDraft),
              revision: (cloud?.revision ?? 0) + sentBodies.length,
              slug: body.subdomain,
              content: body.snapshot,
            });
          }
          return jsonResponse(null, 404);
        }),
      );
    }

    function leaveGuestDraft(updatedAt = "2024-06-01T00:00:00.000Z") {
      localStorageMock.setItem(
        CACHE_KEY,
        JSON.stringify({ slug: "local-slug", content: localContent, updatedAt }),
      );
    }

    it("keeps the cloud draft and asks, even when the guest draft is newer", async () => {
      leaveGuestDraft();
      signIn(cloudDraft);

      await store.getState().loadWorkspace();

      const state = store.getState();
      expect(state.content.identity.bio).toBe("cloud");
      expect(state.slug).toBe("cloud-slug");
      expect(state.guestDraft).toMatchObject({ slug: "local-slug", replacesCloud: true });
      expect(sentBodies).toHaveLength(0);
      expect(localStorageMock.getItem(CACHE_KEY)).not.toBeNull();
    });

    it("brings the guest draft in only when asked, then forgets it", async () => {
      leaveGuestDraft();
      signIn(cloudDraft);
      await store.getState().loadWorkspace();

      const result = await store.getState().keepGuestDraft();

      expect(result.ok).toBe(true);
      expect(store.getState().content.identity.bio).toBe("local");
      expect(sentBodies.at(-1)).toMatchObject({
        subdomain: "local-slug",
        snapshot: { identity: { bio: "local" } },
      });
      expect(store.getState().guestDraft).toBeNull();
      expect(localStorageMock.getItem(CACHE_KEY)).toBeNull();
    });

    it("discards the guest draft and clears it from the browser", async () => {
      leaveGuestDraft();
      signIn(cloudDraft);
      await store.getState().loadWorkspace();

      store.getState().discardGuestDraft();

      expect(store.getState().guestDraft).toBeNull();
      expect(store.getState().content.identity.bio).toBe("cloud");
      expect(localStorageMock.getItem(CACHE_KEY)).toBeNull();
      expect(sentBodies).toHaveLength(0);
    });

    it("asks a new account too: its first draft starts blank, not as the guest's", async () => {
      leaveGuestDraft();
      signIn(null);

      await store.getState().loadWorkspace();
      await vi.waitFor(() => expect(sentBodies).toHaveLength(1));

      expect(sentBodies[0].snapshot.identity.bio).not.toBe("local");
      expect(store.getState().guestDraft).toMatchObject({ replacesCloud: false });
      expect(localStorageMock.getItem(CACHE_KEY)).not.toBeNull();
    });

    it("does not ask about a guest draft that matches the cloud copy", async () => {
      localStorageMock.setItem(
        CACHE_KEY,
        JSON.stringify({ slug: "cloud-slug", content: cloudContent, updatedAt: null }),
      );
      signIn(cloudDraft);

      await store.getState().loadWorkspace();

      expect(store.getState().guestDraft).toBeNull();
      expect(localStorageMock.getItem(CACHE_KEY)).toBeNull();
    });

    // An expired session that opened /editor left the blank default here; bringing it in
    // replaced the account's real draft with an empty one.
    it("does not offer an untouched default guest draft", async () => {
      localStorageMock.setItem(
        CACHE_KEY,
        JSON.stringify({
          slug: "my-portfolio",
          content: createDefaultPortfolio(),
          updatedAt: null,
        }),
      );
      signIn(cloudDraft);

      await store.getState().loadWorkspace();

      expect(store.getState().guestDraft).toBeNull();
      expect(store.getState().content.identity.bio).toBe("cloud");
      expect(localStorageMock.getItem(CACHE_KEY)).toBeNull();
    });

    it("keeps the account's subdomain when the guest draft has every guest's default", async () => {
      localStorageMock.setItem(
        CACHE_KEY,
        JSON.stringify({ slug: "my-portfolio", content: localContent, updatedAt: null }),
      );
      signIn(cloudDraft);
      await store.getState().loadWorkspace();

      await store.getState().keepGuestDraft();

      expect(store.getState().slug).toBe("cloud-slug");
      expect(sentBodies.at(-1)).toMatchObject({ subdomain: "cloud-slug" });
    });
  });

  it("writes nothing to the guest cache until a guest edits", async () => {
    const guest = createPortfolioStore({ ready: true, workspaceState: "ready" });

    expect((await guest.getState().saveDraft()).ok).toBe(true);
    expect(localStorageMock.getItem(CACHE_KEY)).toBeNull();

    guest.getState().updateIdentity({ bio: "guest edit" });
    await guest.getState().saveDraft();
    expect(JSON.parse(localStorageMock.getItem(CACHE_KEY) ?? "{}").content.identity.bio).toBe(
      "guest edit",
    );
  });

  // A session that expires mid-edit is sent to log in; the edits wait in this browser and are
  // offered back after logging in, and the leave-page warning does not stop the redirect.
  it("keeps a signed-in owner's unsaved edits for after the login", async () => {
    const { keepEditsForSignIn } = await import("@/store/portfolio-store");
    const signedIn = createPortfolioStore({
      user: { name: "A", email: "a@x.com" },
      slug: "a",
      content: baseContent,
      ready: true,
      workspaceState: "ready",
    });
    signedIn.getState().updateIdentity({ bio: "typed before expiry" });

    keepEditsForSignIn(signedIn);

    const cached = JSON.parse(localStorageMock.getItem(CACHE_KEY) ?? "{}");
    expect(cached).toMatchObject({
      slug: "a",
      content: { identity: { bio: "typed before expiry" } },
    });
    expect(warnOnLeave(signedIn.getState())).toBe(false);
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
      expect(state.status).toBe("Not saved");
      // The guest draft in this browser is not shown as if it were the account's.
      expect(state.content.identity.bio).not.toBe("cached-bio");
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
        // The editor points at each field from these (P-004).
        details: [{ path: "identity.bio", message: "Add a short bio." }],
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
      expect(staleResult.message).toMatch(/Load the cloud copy/);
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

    describe("save state and autosave (P-020)", () => {
      it.each([
        [
          "a stale revision",
          { message: "Portfolio draft changed in another session.", details: { revision: 5 } },
        ],
        // The conditional write losing a race (P2025) carries no revision.
        ["a lost write race", { message: "Portfolio draft changed in another session." }],
      ])("stops autosave on %s until the owner picks a copy", async (_, body) => {
        const stale = signedIn();
        stale.setState({ isDirty: true, status: "Unsaved changes" });
        stubApi({ "/portfolios/draft": () => errorResponse(409, body) });

        await stale.getState().saveDraft();
        expect(stale.getState().status).toBe("Conflict");
        expect(shouldAutosave(stale.getState())).toBe(false);

        // Typing on does not resume it: that would overwrite the other copy or fail forever.
        stale.getState().updateIdentity({ bio: "still typing" });
        expect(stale.getState().status).toBe("Conflict");
        expect(shouldAutosave(stale.getState())).toBe(false);
      });

      it("does not resend a refused draft every 12 s, only after the next edit", async () => {
        const refused = signedIn();
        refused.setState({ isDirty: true, status: "Unsaved changes" });
        stubApi({
          "/portfolios/draft": () =>
            errorResponse(400, {
              message: "Validation failed",
              details: [{ path: "snapshot.identity.email", message: "Invalid email" }],
            }),
        });

        await refused.getState().saveDraft();
        expect(refused.getState().status).toBe("Not saved");
        expect(refused.getState().saveIssue).toEqual({
          reason: "Validation failed Invalid email",
          retry: false,
        });
        expect(saveStatusLabel(refused.getState().status, refused.getState().saveIssue)).toBe(
          "Not saved: Validation failed Invalid email",
        );
        expect(shouldAutosave(refused.getState())).toBe(false);

        refused.getState().updateIdentity({ email: "gautam@veriworkly.com" });
        expect(shouldAutosave(refused.getState())).toBe(true);
      });

      it("keeps retrying a save that failed for a reason on our side", async () => {
        const failing = signedIn();
        failing.setState({ isDirty: true, status: "Unsaved changes" });
        stubApi({ "/portfolios/draft": () => errorResponse(503, { message: "Try later." }) });

        await failing.getState().saveDraft();
        expect(failing.getState().status).toBe("Not saved");
        expect(shouldAutosave(failing.getState())).toBe(true);
      });

      const cloudDraft = {
        id: "draft-1",
        slug: "gautam-cloud",
        templateId: "atelier",
        revision: 7,
        updatedAt: "2026-10-30T00:00:00.000Z",
        content: {
          ...baseContent,
          templateId: "atelier",
          identity: { ...baseContent.identity, bio: "cloud" },
        },
      };

      it("loads the cloud copy over this one", async () => {
        const stale = signedIn();
        stale.setState({
          status: "Conflict",
          isDirty: true,
          content: { ...baseContent, identity: { ...baseContent.identity, bio: "mine" } },
        });
        stubApi({
          "/portfolios/me": () =>
            jsonResponse({ draft: cloudDraft, publication: null, billing: null }),
        });

        expect((await stale.getState().resolveConflict("cloud")).ok).toBe(true);
        const state = stale.getState();
        expect(state.content.identity.bio).toBe("cloud");
        expect(state.slug).toBe("gautam-cloud");
        expect(state.draft?.revision).toBe(7);
        expect(state).toMatchObject({ status: "Saved", isDirty: false });
      });

      it("keeps this copy by saving it at the cloud copy's revision", async () => {
        const stale = signedIn();
        stale.setState({
          status: "Conflict",
          isDirty: true,
          content: { ...baseContent, identity: { ...baseContent.identity, bio: "mine" } },
        });
        let sent: { revision?: number; snapshot: { identity: { bio: string } } } | undefined;
        vi.stubGlobal(
          "fetch",
          vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.includes("/portfolios/me"))
              return jsonResponse({ draft: cloudDraft, publication: null, billing: null });
            if (url.includes("/portfolios/draft")) {
              sent = JSON.parse(String(init?.body));
              return jsonResponse({ ...cloudDraft, revision: 8, content: sent?.snapshot });
            }
            return jsonResponse(null, 404);
          }),
        );

        expect((await stale.getState().resolveConflict("mine")).ok).toBe(true);
        expect(sent?.revision).toBe(7);
        expect(sent?.snapshot.identity.bio).toBe("mine");
        expect(stale.getState()).toMatchObject({ status: "Saved", isDirty: false });
        expect(stale.getState().draft?.revision).toBe(8);
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
