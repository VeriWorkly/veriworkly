"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { backendApiUrl } from "@/lib/backend";
import {
  createDefaultPortfolio,
  createId,
  normalizeSlug,
  parsePortfolioContent,
  type CloudPortfolioDraft,
  type PortfolioContent,
  type PortfolioSection,
  type PortfolioSectionType,
  type PortfolioPage,
} from "@/lib/portfolio";
import { sectionLabels, sectionSubtitleDefaults } from "@/lib/section-fields";
import { loadPortfolioCache, savePortfolioCache } from "@/lib/portfolio-storage";

export type SaveStatus =
  "Saving" | "Saved" | "Offline" | "Conflict" | "Publish pending" | "Unsaved changes";
export type WorkspaceState = "loading" | "ready" | "error";
export type Publication = { subdomain: string; status: "LIVE" | "GRACE" | "SUSPENDED" } | null;
export type Billing = { canPublish: boolean; status: string; graceEndsAt?: string | null };
export type EditorPanel = "profile" | "sections" | "style" | "sharing";
export type PortfolioAnalyticsData = {
  // Set by the server when the account lacks the Creator Pro entitlement. The payload
  // then carries no real figures at all, so the dashboard must render a locked state
  // rather than the zeros — showing "0 views" to a paying-eligible user would be a lie.
  locked: boolean;
  totalViews: number;
  daily: Array<{ date: string; count: number }>;
  referrers: Array<{ host: string; count: number }>;
};
export type PortfolioWorkspaceBootstrap = {
  user: { name?: string | null; email?: string | null } | null;
  workspace: { draft?: unknown; publication?: Publication; billing?: Billing } | null;
  analytics: PortfolioAnalyticsData | null;
};

async function fetchPayload(path: string, fallbackMessage: string, init?: RequestInit) {
  const response = await authenticatedFetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || fallbackMessage);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return payload;
}

// Module-level (not store state) so concurrent `loadWorkspace()` calls can
// share the in-flight promise without triggering extra re-renders.
let loadWorkspaceInFlight: Promise<void> | null = null;

/** The slice of state that a server bootstrap determines. */
export type PortfolioHydratedState = Pick<
  PortfolioStoreState,
  | "user"
  | "draft"
  | "content"
  | "slug"
  | "publication"
  | "billing"
  | "analyticsData"
  | "message"
  | "previewIssue"
  | "workspaceState"
  | "status"
  | "ready"
  | "isDirty"
>;

/**
 * Pure projection of a server bootstrap onto store state.
 *
 * Kept free of side effects (no cache writes) precisely so it can also run during
 * render — including on the server — to seed a freshly created store. `hydrateWorkspace`
 * layers the browser-only cache write on top.
 */
export function buildHydratedState({
  user,
  workspace,
  analytics,
}: PortfolioWorkspaceBootstrap): PortfolioHydratedState {
  const cloud = workspace?.draft as CloudPortfolioDraft | undefined;
  const restored = cloud
    ? ({ ...cloud, content: parsePortfolioContent(cloud.content) } as CloudPortfolioDraft)
    : null;
  const content = restored?.content ?? createDefaultPortfolio(user ?? undefined);
  const slug = restored?.slug ?? (normalizeSlug(user?.name || "portfolio") || "portfolio");
  const isGuest = !user;

  return {
    user,
    draft: restored,
    content,
    slug,
    publication: workspace?.publication ?? null,
    billing: workspace?.billing ?? { canPublish: false, status: "INACTIVE" },
    analyticsData: analytics,
    message: isGuest ? "" : workspace ? "" : "Could not load your portfolio workspace.",
    previewIssue: "",
    workspaceState: "ready",
    status: isGuest ? "Saved" : workspace ? "Saved" : "Offline",
    ready: true,
    isDirty: false,
  };
}

interface PortfolioStoreState {
  content: PortfolioContent;
  slug: string;
  draft: CloudPortfolioDraft | null;
  publication: Publication;
  billing: Billing;
  user: { name?: string | null; email?: string | null } | null;
  analyticsData: PortfolioAnalyticsData | null;
  status: SaveStatus;
  message: string;
  ready: boolean;
  workspaceState: WorkspaceState;
  previewIssue: string;
  activePanel: EditorPanel;
  isDirty: boolean;
  selectedPageId: string | null;

  // Setters
  setContent: (content: PortfolioContent) => void;
  setSlug: (slug: string) => void;
  updateSlug: (slug: string) => void;
  setDraft: (draft: CloudPortfolioDraft | null) => void;
  setPublication: (publication: Publication) => void;
  setBilling: (billing: Billing) => void;
  setStatus: (status: SaveStatus) => void;
  setMessage: (message: string) => void;
  setReady: (ready: boolean) => void;
  setWorkspaceState: (workspaceState: WorkspaceState) => void;
  setPreviewIssue: (previewIssue: string) => void;
  setActivePanel: (activePanel: EditorPanel) => void;
  setIsDirty: (isDirty: boolean) => void;
  setSelectedPageId: (id: string | null) => void;

  // State Updaters
  updateContent: (patch: Partial<PortfolioContent>) => void;
  updateIdentity: (patch: Partial<PortfolioContent["identity"]>) => void;
  updateSection: (id: string, patch: Partial<PortfolioSection>) => void;
  moveSection: (index: number, direction: -1 | 1) => void;
  addSection: (type: PortfolioSectionType) => void;
  removeSection: (id: string) => void;

  // Page Management
  addPage: (slug: string, title: string) => void;
  removePage: (id: string) => void;
  updatePage: (id: string, patch: Partial<PortfolioPage>) => void;

  // Async Actions
  loadWorkspace: () => Promise<void>;
  hydrateWorkspace: (initialData: PortfolioWorkspaceBootstrap) => void;
  saveDraft: () => Promise<CloudPortfolioDraft | null>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
}

export type PortfolioStoreApi = ReturnType<typeof createPortfolioStore>;

/**
 * Creates an isolated store instance.
 *
 * This used to be a module-level `create()` singleton. On the server that single
 * instance is shared by every in-flight request, so it could never be seeded with a
 * user's data during render — doing so would expose one user's portfolio to another
 * user's response. That left the store empty during SSR, and pages driven by it
 * (settings, editor) shipped placeholder content that the client then replaced.
 *
 * One store per provider mount removes that constraint: each request gets its own
 * instance, seeded with exactly its own bootstrap.
 */
export function createPortfolioStore(preloaded?: Partial<PortfolioStoreState>) {
  return createStore<PortfolioStoreState>()(
    subscribeWithSelector((set, get) => ({
      content: createDefaultPortfolio(),
      slug: "portfolio",
      draft: null,
      publication: null,
      billing: { canPublish: false, status: "INACTIVE" },
      user: null,
      analyticsData: null,
      status: "Saved",
      message: "",
      ready: false,
      workspaceState: "loading",
      previewIssue: "",
      activePanel: "profile",
      isDirty: false,
      selectedPageId: null,

      setContent: (content) => set({ content }),
      setSlug: (slug) => set({ slug }),
      updateSlug: (slug) =>
        set((state) => ({
          slug: normalizeSlug(slug),
          isDirty: state.ready ? true : state.isDirty,
          status: state.ready ? "Unsaved changes" : state.status,
        })),
      setDraft: (draft) => set({ draft }),
      setPublication: (publication) => set({ publication }),
      setBilling: (billing) => set({ billing }),
      setStatus: (status) => set({ status }),
      setMessage: (message) => set({ message }),
      setReady: (ready) => set({ ready }),
      setWorkspaceState: (workspaceState) => set({ workspaceState }),
      setPreviewIssue: (previewIssue) => set({ previewIssue }),
      setActivePanel: (activePanel) => set({ activePanel }),
      setIsDirty: (isDirty) => set({ isDirty }),
      setSelectedPageId: (id) => set({ selectedPageId: id }),

      updateContent: (patch) =>
        set((state) => ({
          content: { ...state.content, ...patch },
          isDirty: state.ready ? true : state.isDirty,
          status: state.ready ? "Unsaved changes" : state.status,
        })),

      updateIdentity: (patch) =>
        set((state) => ({
          content: {
            ...state.content,
            identity: { ...state.content.identity, ...patch },
          },
          isDirty: state.ready ? true : state.isDirty,
          status: state.ready ? "Unsaved changes" : state.status,
        })),

      updateSection: (id, patch) =>
        set((state) => {
          const updateSections = (sections: PortfolioSection[]) =>
            sections.map((s) => (s.id === id ? { ...s, ...patch } : s));
          if (state.selectedPageId && state.content.pages) {
            return {
              content: {
                ...state.content,
                pages: state.content.pages.map((p) =>
                  p.id === state.selectedPageId
                    ? { ...p, sections: updateSections(p.sections) }
                    : p,
                ),
              },
              isDirty: state.ready ? true : state.isDirty,
              status: state.ready ? "Unsaved changes" : state.status,
            };
          }
          return {
            content: { ...state.content, sections: updateSections(state.content.sections) },
            isDirty: state.ready ? true : state.isDirty,
            status: state.ready ? "Unsaved changes" : state.status,
          };
        }),

      moveSection: (index, direction) =>
        set((state) => {
          const mutateSections = (sections: PortfolioSection[]) => {
            const arr = [...sections];
            const target = index + direction;
            if (target >= 0 && target < arr.length) {
              [arr[index], arr[target]] = [arr[target], arr[index]];
            }
            return arr;
          };
          if (state.selectedPageId && state.content.pages) {
            return {
              content: {
                ...state.content,
                pages: state.content.pages.map((p) =>
                  p.id === state.selectedPageId
                    ? { ...p, sections: mutateSections(p.sections) }
                    : p,
                ),
              },
              isDirty: state.ready ? true : state.isDirty,
              status: state.ready ? "Unsaved changes" : state.status,
            };
          }
          return {
            content: { ...state.content, sections: mutateSections(state.content.sections) },
            isDirty: state.ready ? true : state.isDirty,
            status: state.ready ? "Unsaved changes" : state.status,
          };
        }),

      addSection: (type) =>
        set((state) => {
          const newSection: PortfolioSection = {
            id: createId("section"),
            type,
            // `sectionInfo` carries the human label ("Test Scores"); the old
            // `type[0].toUpperCase() + slice(1)` produced "TestScores" for
            // camelCase types and rendered that straight into the heading.
            title: sectionLabels[type],
            subtitle: sectionSubtitleDefaults[type],
            visible: true,
            items: [],
          };
          if (state.selectedPageId && state.content.pages) {
            return {
              content: {
                ...state.content,
                pages: state.content.pages.map((p) =>
                  p.id === state.selectedPageId
                    ? { ...p, sections: [...p.sections, newSection] }
                    : p,
                ),
              },
              isDirty: state.ready ? true : state.isDirty,
              status: state.ready ? "Unsaved changes" : state.status,
            };
          }
          return {
            content: { ...state.content, sections: [...state.content.sections, newSection] },
            isDirty: state.ready ? true : state.isDirty,
            status: state.ready ? "Unsaved changes" : state.status,
          };
        }),

      removeSection: (id) =>
        set((state) => {
          if (state.selectedPageId && state.content.pages) {
            return {
              content: {
                ...state.content,
                pages: state.content.pages.map((p) =>
                  p.id === state.selectedPageId
                    ? { ...p, sections: p.sections.filter((s) => s.id !== id) }
                    : p,
                ),
              },
              isDirty: state.ready ? true : state.isDirty,
              status: state.ready ? "Unsaved changes" : state.status,
            };
          }
          return {
            content: {
              ...state.content,
              sections: state.content.sections.filter((item) => item.id !== id),
            },
            isDirty: state.ready ? true : state.isDirty,
            status: state.ready ? "Unsaved changes" : state.status,
          };
        }),

      addPage: (slug, title) =>
        set((state) => {
          const newPage: PortfolioPage = {
            id: createId("page"),
            slug,
            title,
            sections: [],
          };
          return {
            content: {
              ...state.content,
              pages: [...(state.content.pages || []), newPage],
            },
            isDirty: state.ready ? true : state.isDirty,
            status: state.ready ? "Unsaved changes" : state.status,
          };
        }),

      removePage: (id) =>
        set((state) => ({
          content: {
            ...state.content,
            pages: (state.content.pages || []).filter((page) => page.id !== id),
          },
          selectedPageId: state.selectedPageId === id ? null : state.selectedPageId,
          isDirty: state.ready ? true : state.isDirty,
          status: state.ready ? "Unsaved changes" : state.status,
        })),

      updatePage: (id, patch) =>
        set((state) => ({
          content: {
            ...state.content,
            pages: (state.content.pages || []).map((page) =>
              page.id === id ? { ...page, ...patch } : page,
            ),
          },
          isDirty: state.ready ? true : state.isDirty,
          status: state.ready ? "Unsaved changes" : state.status,
        })),

      hydrateWorkspace: (bootstrap) => {
        const next = buildHydratedState(bootstrap);

        if (next.draft) savePortfolioCache(next.draft);

        set(next);
      },

      loadWorkspace: async () => {
        // Re-entrancy guard: a double-mount effect (React StrictMode, a fast
        // remount, etc.) firing this twice in a row must not race two
        // concurrent loads — the second one piggybacks on the first instead
        // of duplicating the fetch and the "no cloud draft yet" auto-save.
        if (loadWorkspaceInFlight) return loadWorkspaceInFlight;

        loadWorkspaceInFlight = (async () => {
          const cached = loadPortfolioCache();
          if (cached) {
            set({ content: cached.content, slug: cached.slug });
          }
          set({ workspaceState: "loading", previewIssue: "" });
          try {
            // Standard check to see if user has a session without triggering redirect
            const response = await fetch(backendApiUrl("/users/me"), { credentials: "include" });
            if (response.status === 401 || response.status === 404) {
              // Guest mode!
              set({
                user: null,
                draft: null,
                content: cached?.content ?? createDefaultPortfolio(),
                slug: cached?.slug ?? "portfolio",
                publication: null,
                billing: { canPublish: false, status: "INACTIVE" },
                analyticsData: null,
                message: "",
                workspaceState: "ready",
                status: "Saved",
                ready: true,
              });
              return;
            }

            // User is logged in, continue with fetching data
            const [userPayload, portfolioPayload, analyticsPayload] = await Promise.all([
              response
                .json()
                .then((r) => r.data)
                .catch(() => null),
              fetchPayload("/portfolios/me", "Could not load your portfolio workspace."),
              fetchPayload("/portfolios/analytics", "Could not load portfolio analytics.").catch(
                () => null,
              ),
            ]);
            const user = userPayload ?? null;
            const analytics = analyticsPayload?.data ?? null;
            const cloud = portfolioPayload?.data?.draft;

            let draftToSet: CloudPortfolioDraft | null = null;
            let contentToSet = cached?.content ?? createDefaultPortfolio(user ?? undefined);
            let slugToSet =
              cached?.slug ?? (normalizeSlug(user?.name || "portfolio") || "portfolio");
            let shouldSyncLocalToCloud = false;
            let mergeMessage = "";

            if (cloud) {
              const restoredCloud = {
                ...cloud,
                content: parsePortfolioContent(cloud.content),
              } as CloudPortfolioDraft;

              draftToSet = restoredCloud;

              if (cached) {
                // Compare local cache with cloud content to see if there are local guest edits
                const localSerialized = JSON.stringify(cached.content);
                const cloudSerialized = JSON.stringify(restoredCloud.content);
                const contentDiffers =
                  localSerialized !== cloudSerialized || cached.slug !== restoredCloud.slug;

                if (!contentDiffers) {
                  contentToSet = restoredCloud.content;
                  slugToSet = restoredCloud.slug;
                } else {
                  // Both a local guest draft and a cloud draft exist, and they
                  // disagree. Only let the local copy win when it is *provably*
                  // newer than the cloud draft — otherwise a stale local cache
                  // (or one written before timestamps existed) would silently
                  // clobber cloud content that may have been edited elsewhere,
                  // e.g. from another device or after publishing.
                  const localUpdatedAt = cached.updatedAt ? Date.parse(cached.updatedAt) : NaN;
                  const cloudUpdatedAt = Date.parse(restoredCloud.updatedAt);
                  const localIsNewer =
                    !Number.isNaN(localUpdatedAt) &&
                    !Number.isNaN(cloudUpdatedAt) &&
                    localUpdatedAt > cloudUpdatedAt;

                  if (localIsNewer) {
                    contentToSet = cached.content;
                    slugToSet = cached.slug;
                    shouldSyncLocalToCloud = true;
                  } else {
                    contentToSet = restoredCloud.content;
                    slugToSet = restoredCloud.slug;
                    if (Number.isNaN(localUpdatedAt)) {
                      mergeMessage =
                        "We found local draft changes made before you logged in that couldn't be dated, so your saved portfolio was kept. Re-apply those changes if you still need them.";
                    }
                  }
                }
              } else {
                contentToSet = restoredCloud.content;
                slugToSet = restoredCloud.slug;
              }
            } else {
              // No cloud draft exists yet.
              if (cached) {
                shouldSyncLocalToCloud = true;
              } else {
                const seeded = createDefaultPortfolio(user ?? undefined);
                contentToSet = seeded;
                slugToSet = normalizeSlug(user?.name || "portfolio") || "portfolio";
                shouldSyncLocalToCloud = true;
              }
            }

            set({
              user,
              draft: draftToSet,
              content: contentToSet,
              slug: slugToSet,
              publication: portfolioPayload?.data?.publication ?? null,
              billing: portfolioPayload?.data?.billing ?? { canPublish: false, status: "INACTIVE" },
              analyticsData: analytics,
              message: mergeMessage,
              workspaceState: "ready",
              ready: true,
            });

            if (shouldSyncLocalToCloud) {
              void get().saveDraft();
            }
          } catch (error) {
            const status = (error as { status?: number })?.status;
            if (status === 401 || status === 404) {
              // Guest mode fallback on 401/404 rejections
              set({
                user: null,
                draft: null,
                content: cached?.content ?? createDefaultPortfolio(),
                slug: cached?.slug ?? "portfolio",
                publication: null,
                billing: { canPublish: false, status: "INACTIVE" },
                analyticsData: null,
                message: "",
                workspaceState: "ready",
                status: "Saved",
                ready: true,
              });
              return;
            }

            set({
              status: "Offline",
              workspaceState: "error",
              previewIssue: "Live preview is unavailable until the workspace reconnects.",
              message:
                error instanceof Error ? error.message : "Could not load your portfolio workspace.",
              ready: true,
            });
          }
        })().finally(() => {
          loadWorkspaceInFlight = null;
        });

        return loadWorkspaceInFlight;
      },

      saveDraft: async () => {
        const current = get();
        set({ status: "Saving" });
        savePortfolioCache({ slug: current.slug, content: current.content });
        if (!current.user) {
          set({
            status: "Saved",
            isDirty: false,
            message: "Saved locally. Log in to sync to cloud.",
          });
          return null;
        }
        try {
          const response = await authenticatedFetch("/portfolios/draft", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId: current.draft?.id,
              subdomain: current.slug,
              revision: current.draft?.revision,
              snapshot: current.content,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (response.status === 409) {
            set({
              status: "Conflict",
              message: "This draft changed in another session. Refresh before continuing.",
            });
            return null;
          }
          if (!response.ok) throw new Error(payload.message || "Draft sync failed.");
          const saved = {
            ...payload.data,
            content: parsePortfolioContent(payload.data.content),
          } as CloudPortfolioDraft;
          set({
            draft: saved,
            status: "Saved",
            isDirty: false,
            message: "",
            previewIssue: "",
          });
          return saved;
        } catch (error) {
          set({
            status: "Offline",
            previewIssue: "Live preview is unavailable while your draft cannot sync.",
            message:
              error instanceof Error
                ? `${error.message} Your changes remain in this browser.`
                : "Draft sync failed. Your changes remain in this browser.",
          });
          return null;
        }
      },

      publish: async () => {
        const current = get();
        if (!current.user) {
          set({
            status: "Saved",
            message: "Please log in to publish your portfolio.",
          });
          return;
        }
        set({ status: "Publish pending" });
        const saved = await current.saveDraft();
        if (!saved) return;
        try {
          const response = await authenticatedFetch("/portfolios/publish", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId: saved.id,
              subdomain: saved.slug,
              revision: saved.revision,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.message || "Unable to publish.");
          set({
            publication: { subdomain: payload.data.subdomain, status: "LIVE" },
            status: "Saved",
            message: `Published at ${payload.data.publicUrl}`,
          });
        } catch (error) {
          set({
            status: "Saved",
            message: error instanceof Error ? error.message : "Unable to publish.",
          });
        }
      },

      unpublish: async () => {
        const current = get();
        if (!current.user) {
          set({
            message: "Please log in to manage publications.",
          });
          return;
        }
        try {
          await fetchPayload("/portfolios/unpublish", "Unable to unpublish your portfolio.", {
            method: "POST",
          });
          const pub = get().publication;
          set({
            publication: pub ? { ...pub, status: "SUSPENDED" } : null,
            message: "Public site unpublished. Your draft is retained.",
          });
        } catch (error) {
          set({
            message: error instanceof Error ? error.message : "Unable to unpublish your portfolio.",
          });
        }
      },

      ...preloaded,
    })),
  );
}

const PortfolioStoreContext = createContext<PortfolioStoreApi | null>(null);

export const PortfolioStoreProvider = PortfolioStoreContext.Provider;

function usePortfolioStoreContext() {
  const store = useContext(PortfolioStoreContext);

  if (!store) throw new Error("usePortfolioStore must be used within a WorkspaceProvider");

  return store;
}

/**
 * Unchanged call signature from the previous singleton, so every existing
 * `usePortfolioStore((state) => state.x)` selector keeps working as-is.
 */
export function usePortfolioStore<T>(selector: (state: PortfolioStoreState) => T): T {
  return useStore(usePortfolioStoreContext(), selector);
}

/**
 * The store API itself, for imperative reads outside of render (effects, timers)
 * that previously used `usePortfolioStore.getState()`.
 */
export function usePortfolioStoreApi() {
  return usePortfolioStoreContext();
}
