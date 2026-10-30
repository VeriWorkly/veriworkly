"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
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
import { defaultSubdomain, isAllowedSubdomain } from "@/lib/subdomain";
import { sectionLabels, sectionSubtitleDefaults } from "@/lib/section-fields";
import {
  clearPortfolioCache,
  loadPortfolioCache,
  savePortfolioCache,
} from "@/lib/portfolio-storage";

export type SaveStatus =
  "Saving" | "Saved" | "Offline" | "Conflict" | "Publish pending" | "Unsaved changes";
export type WorkspaceState = "loading" | "ready" | "error";
/** Why a SUSPENDED site is offline (`GET /portfolios/me`); null while it is online. */
export type OfflineReason = "moderation" | "owner" | "billing" | null;
export type Publication = {
  subdomain: string;
  status: "LIVE" | "GRACE" | "SUSPENDED";
  offlineReason?: OfflineReason;
} | null;
/** The slice of the server's billing summary the workspace reads. */
export type Billing = {
  /** The portfolio_publish grant is in effect: Creator Pro, the Bundle or an active pass. */
  canPublish: boolean;
  status: string;
  plan?: "FREE" | "PORTFOLIO_PRO" | "AI_CREDITS" | "BUNDLE";
  graceEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  accessEndsAt?: string | null;
  access?: {
    tier: "bundle" | "portfolio_pro" | "ai_credits" | "pass" | "credits" | "free";
    isPaying: boolean;
  };
};
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

/** What a save, publish or unpublish actually did. Every toast about one comes from this. */
export type ActionResult = { ok: boolean; message: string; status?: number };
export type SaveResult = ActionResult & { draft?: CloudPortfolioDraft };

/** The server's own message, plus any field messages a 400 carries in `details`. */
function serverMessage(payload: { message?: string; details?: unknown }, fallback: string) {
  const details = Array.isArray(payload.details)
    ? payload.details.map((detail: { message?: string }) => detail?.message).filter(Boolean)
    : [];
  return [payload.message || fallback, ...details].join(" ");
}

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

/** A guest's subdomain carried into an account; a guest default like "portfolio" is reserved. */
function accountSlug(slug: string, user: { name?: string | null; email?: string | null } | null) {
  return isAllowedSubdomain(slug) ? slug : defaultSubdomain(user);
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
  const slug = restored?.slug ?? defaultSubdomain(user);
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
  applyMasterProfileImport: (nextContent: PortfolioContent) => void;
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
  saveDraft: () => Promise<SaveResult>;
  publish: () => Promise<ActionResult>;
  unpublish: () => Promise<ActionResult>;
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
/** One draft save, of the store's content as it is when sent. Only `saveDraft` calls it. */
async function sendDraft(store: StoreApi<PortfolioStoreState>): Promise<SaveResult> {
  const { getState: get, setState: set } = store;
  const current = get();
  // A workspace that failed to load has no user only because the load failed, not because
  // this is a guest: saving it locally as a guest would put a blank draft in the cache.
  if (current.workspaceState === "error") {
    return { ok: false, message: "Your workspace did not load. Reload the page, then save." };
  }
  set({ status: "Saving" });
  if (!current.user) {
    savePortfolioCache({ slug: current.slug, content: current.content });
    set({ status: "Saved", isDirty: false });
    return { ok: true, message: "Saved locally. Log in to sync to cloud." };
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
    // A stale revision says which one is current; any other 409 (a subdomain clash) carries
    // its own message and is fixed in the form, not by a refresh.
    if (response.status === 409 && payload.details?.revision !== undefined) {
      set({ status: "Conflict" });
      return {
        ok: false,
        status: 409,
        message: "This draft changed in another session. Refresh before continuing.",
      };
    }
    if (!response.ok) {
      const message = serverMessage(payload, "Draft sync failed.");
      // A 4xx is the server refusing this draft, so retrying the same content will not help.
      if (response.status < 500 && response.status !== 429) {
        set({ status: response.status === 409 ? "Conflict" : "Unsaved changes" });
        return { ok: false, status: response.status, message };
      }
      throw Object.assign(new Error(message), { status: response.status });
    }
    const saved = {
      ...payload.data,
      content: parsePortfolioContent(payload.data.content),
    } as CloudPortfolioDraft;
    // An edit made while this save was on the wire is not in it, and stays unsaved.
    const changed = get().content !== current.content || get().slug !== current.slug;
    set({
      draft: saved,
      status: changed ? "Unsaved changes" : "Saved",
      isDirty: changed,
      message: "",
      previewIssue: "",
    });
    return { ok: true, message: "Draft saved.", draft: saved };
  } catch (error) {
    set({
      status: "Offline",
      previewIssue: "Live preview is unavailable while your draft cannot sync.",
    });
    const reason =
      error instanceof Error && error.name !== "AbortError" ? error.message : "Draft sync failed.";
    return {
      ok: false,
      status: (error as { status?: number }).status,
      message: `${reason} Your changes remain in this browser.`,
    };
  }
}

export function createPortfolioStore(preloaded?: Partial<PortfolioStoreState>) {
  let saveInFlight: Promise<SaveResult> | null = null;
  let saveQueued: Promise<SaveResult> | null = null;
  const startSave = (): Promise<SaveResult> => {
    saveInFlight = sendDraft(store).finally(() => {
      saveInFlight = null;
    });
    return saveInFlight;
  };

  const store: StoreApi<PortfolioStoreState> = createStore<PortfolioStoreState>()(
    subscribeWithSelector((set, get) => ({
      content: createDefaultPortfolio(),
      slug: defaultSubdomain(),
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

      applyMasterProfileImport: (nextContent) =>
        set((state) => ({
          content: nextContent,
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

      hydrateWorkspace: (bootstrap) => set(buildHydratedState(bootstrap)),

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
                slug: cached?.slug ?? defaultSubdomain(),
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
            // Anything else that is not a user (5xx, 429, a broken body) is an outage, not a
            // guest: dropping to guest mode here would hide a signed-in user's draft (P-017).
            if (!response.ok) {
              throw Object.assign(new Error("Could not load your portfolio workspace."), {
                status: response.status,
              });
            }

            // User is logged in, continue with fetching data
            const [userPayload, portfolioPayload, analyticsPayload] = await Promise.all([
              response
                .json()
                .then((r) => r.data)
                .catch(() => null)
                .then((data) => {
                  if (!data) throw new Error("Could not load your portfolio workspace.");
                  return data;
                }),
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
            let slugToSet = cached ? accountSlug(cached.slug, user) : defaultSubdomain(user);
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
                    slugToSet = isAllowedSubdomain(cached.slug) ? cached.slug : restoredCloud.slug;
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
                slugToSet = defaultSubdomain(user);
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

            // No caller is waiting on this save, so its failure goes to the notice. Once the
            // guest draft is in the account (or lost to a newer cloud copy) it is not carried
            // in again.
            if (cached && !shouldSyncLocalToCloud) clearPortfolioCache();
            if (shouldSyncLocalToCloud) {
              void get()
                .saveDraft()
                .then((result) => {
                  if (result.ok) clearPortfolioCache();
                  else set({ message: result.message });
                });
            }
          } catch (error) {
            const status = (error as { status?: number })?.status;
            if (status === 401 || status === 404) {
              // Guest mode fallback on 401/404 rejections
              set({
                user: null,
                draft: null,
                content: cached?.content ?? createDefaultPortfolio(),
                slug: cached?.slug ?? defaultSubdomain(),
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

      saveDraft: () => {
        // One save on the wire at a time (SV-08). The autosave, a manual Save and Publish all
        // land here; sent together they carried the same revision, which the server refuses as
        // stale (V-304). A save asked for mid-flight waits, then sends the content as it is then
        // with the revision the first one returned; every call made meanwhile shares it.
        if (saveInFlight) {
          saveQueued ??= saveInFlight.then(() => {
            saveQueued = null;
            return startSave();
          });
          return saveQueued;
        }
        return startSave();
      },

      // Publish and unpublish report through their result only; the caller shows it.
      publish: async () => {
        if (!get().user) return { ok: false, message: "Please log in to publish your portfolio." };
        set({ status: "Publish pending" });
        const saved = await get().saveDraft();
        if (!saved.ok || !saved.draft) return saved;
        try {
          const response = await authenticatedFetch("/portfolios/publish", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId: saved.draft.id,
              subdomain: saved.draft.slug,
              revision: saved.draft.revision,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            return {
              ok: false,
              status: response.status,
              message: serverMessage(payload, "Your portfolio could not be published."),
            };
          }
          set({
            publication: { subdomain: payload.data.subdomain, status: "LIVE", offlineReason: null },
          });
          return { ok: true, message: `Published at ${payload.data.publicUrl}` };
        } catch {
          return {
            ok: false,
            message: "Could not reach VeriWorkly, so your portfolio was not published. Try again.",
          };
        }
      },

      unpublish: async () => {
        if (!get().user) return { ok: false, message: "Please log in to manage your site." };
        const offline = () => {
          const pub = get().publication;
          set({
            publication: pub ? { ...pub, status: "SUSPENDED", offlineReason: "owner" } : null,
          });
        };
        try {
          const response = await authenticatedFetch("/portfolios/unpublish", { method: "POST" });
          // 404 means nothing is published: the site is already offline, which is what was asked.
          if (response.status === 404) {
            offline();
            return { ok: true, status: 404, message: "Your site is already offline." };
          }
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            return {
              ok: false,
              status: response.status,
              message: serverMessage(payload, "Your site could not be unpublished."),
            };
          }
          offline();
          return { ok: true, message: "Your site is offline. Your draft is kept." };
        } catch {
          return {
            ok: false,
            message: "Could not reach VeriWorkly, so your site is still online. Try again.",
          };
        }
      },

      ...preloaded,
    })),
  );

  return store;
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
