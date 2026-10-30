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
import { PORTFOLIO_LIMITS } from "@/lib/portfolio-limits";
import { sectionMeta } from "@/lib/section-fields";
import {
  clearPortfolioCache,
  loadPortfolioCache,
  savePortfolioCache,
} from "@/lib/portfolio-storage";

/**
 * Where the draft stands. "Not saved" carries its reason in `saveIssue`; "Conflict" means another
 * tab or device saved first, and autosave waits until the owner picks a copy (`resolveConflict`).
 */
export type SaveStatus =
  "Saved" | "Saving" | "Unsaved changes" | "Not saved" | "Conflict" | "Publish pending";
/** Why the last save failed, and whether trying the same content again could help. */
export type SaveIssue = { reason: string; retry: boolean } | null;

/** The save state in words, with the reason when a save failed. */
export function saveStatusLabel(status: SaveStatus, issue: SaveIssue) {
  if (status === "Not saved") return `Not saved: ${issue?.reason ?? "try again."}`;
  if (status === "Conflict") return "Conflict: changed in another tab or device";
  if (status === "Saving") return "Saving...";
  if (status === "Publish pending") return "Publishing...";
  return status;
}
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
export type ActionResult = {
  ok: boolean;
  message: string;
  status?: number;
  /** A 400's field messages, so the editor can point at each one. */
  details?: Array<{ path: string; message: string }>;
};
export type SaveResult = ActionResult & { draft?: CloudPortfolioDraft };

/** A 400's `details: [{ path, message }]`, or none. */
function fieldDetails(payload: { details?: unknown }) {
  return Array.isArray(payload.details)
    ? (payload.details as Array<{ path?: unknown; message?: unknown }>)
        .filter((detail) => typeof detail?.message === "string")
        .map((detail) => ({ path: String(detail.path ?? ""), message: String(detail.message) }))
    : [];
}

/** `details` on a result only when the server sent field messages. */
function withDetails(payload: { details?: unknown }) {
  const details = fieldDetails(payload);
  return details.length ? { details } : {};
}

/** The server's own message, plus any field messages a 400 carries in `details`. */
function serverMessage(payload: { message?: string; details?: unknown }, fallback: string) {
  return [payload.message || fallback, ...fieldDetails(payload).map((d) => d.message)].join(" ");
}

/**
 * A stale draft: the revision check (409 with `details.revision`) or the conditional write losing
 * a race (409 "changed in another session", which carries no revision).
 */
function isStaleDraft(
  status: number,
  payload: { message?: string; details?: { revision?: unknown } },
) {
  return (
    status === 409 &&
    (payload.details?.revision !== undefined ||
      /changed in another session/i.test(payload.message ?? ""))
  );
}

/** Any edit: unsaved now, except that a conflict stays one until the owner resolves it. */
function touched(state: PortfolioStoreState): Partial<PortfolioStoreState> {
  if (!state.ready) return {};
  if (state.status === "Conflict") return { isDirty: true };
  return { isDirty: true, status: "Unsaved changes", saveIssue: null };
}

/** Autosave only content a save could still land: never a conflict, never a refused draft again. */
export function shouldAutosave(
  state: Pick<PortfolioStoreState, "isDirty" | "status" | "saveIssue">,
) {
  if (!state.isDirty) return false;
  if (state.status === "Unsaved changes") return true;
  return state.status === "Not saved" && state.saveIssue?.retry === true;
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

/**
 * Leaving the page (`beforeunload`): true when the browser should ask first. A guest's draft lives
 * in this browser, so it is written now and the guest is never held up.
 */
export function warnOnLeave(
  state: Pick<PortfolioStoreState, "isDirty" | "user" | "workspaceState" | "slug" | "content">,
) {
  if (!state.isDirty) return false;
  if (!state.user && state.workspaceState === "ready") {
    savePortfolioCache({ slug: state.slug, content: state.content });
    return false;
  }
  return true;
}

/** Content with section ids blanked: the default draft makes new random ones every time. */
function withoutSectionIds(content: PortfolioContent) {
  return JSON.stringify({
    ...content,
    sections: content.sections.map((section) => ({ ...section, id: "" })),
  });
}

/** A guest draft nobody edited: the blank default, never worth offering to an account. */
export function isUntouchedDefault(content: PortfolioContent) {
  return (
    withoutSectionIds(content) ===
    withoutSectionIds(parsePortfolioContent(createDefaultPortfolio()))
  );
}

/**
 * The session ran out mid-edit and the tab is about to go to the login page. Unsaved edits are
 * kept in this browser as a guest draft, so after logging in the owner is offered them back, and
 * the leave-page warning no longer holds up the redirect.
 */
export function keepEditsForSignIn(store: StoreApi<PortfolioStoreState>) {
  const state = store.getState();
  if (!state.isDirty || state.workspaceState !== "ready") return;
  savePortfolioCache({ slug: state.slug, content: state.content });
  store.setState({ isDirty: false });
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
  | "message"
  | "workspaceState"
  | "status"
  | "saveIssue"
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
    message: isGuest ? "" : workspace ? "" : "Could not load your portfolio workspace.",
    workspaceState: "ready",
    status: isGuest || workspace ? "Saved" : "Not saved",
    saveIssue:
      isGuest || workspace ? null : { reason: "Your workspace did not load.", retry: false },
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
  status: SaveStatus;
  saveIssue: SaveIssue;
  message: string;
  ready: boolean;
  workspaceState: WorkspaceState;
  isDirty: boolean;
  selectedPageId: string | null;
  /** A guest draft found in this browser after signing in, until the owner keeps or discards it. */
  guestDraft: { content: PortfolioContent; slug: string; replacesCloud: boolean } | null;

  // Setters
  updateSlug: (slug: string) => void;
  setMessage: (message: string) => void;
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
  addPage: (slug: string, title: string, sections?: PortfolioSection[]) => void;
  removePage: (id: string) => void;

  // Async Actions
  loadWorkspace: () => Promise<void>;
  hydrateWorkspace: (initialData: PortfolioWorkspaceBootstrap) => void;
  saveDraft: () => Promise<SaveResult>;
  publish: () => Promise<ActionResult>;
  unpublish: () => Promise<ActionResult>;
  /** After a conflict: take the cloud copy, or save this one over it. */
  resolveConflict: (keep: "cloud" | "mine") => Promise<ActionResult>;
  /** Bring the guest draft into the account (replacing the current draft), or forget it. */
  keepGuestDraft: () => Promise<ActionResult>;
  discardGuestDraft: () => void;
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
    // Only a real edit reaches the cache: a blank default written here would later be offered
    // to the account as "the draft you made before signing in".
    if (current.isDirty) savePortfolioCache({ slug: current.slug, content: current.content });
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
    // An edit made while this save was on the wire is not in it, and stays unsaved.
    const changed = () => get().content !== current.content || get().slug !== current.slug;
    // Another tab or device saved first. Autosave stops here: saving again would either fail
    // forever or, with a fresh revision, silently overwrite that copy. The owner picks one.
    if (isStaleDraft(response.status, payload)) {
      set({
        status: "Conflict",
        saveIssue: { reason: "Changed in another tab or device.", retry: false },
      });
      return {
        ok: false,
        status: 409,
        message:
          "This draft changed in another tab or device. Load the cloud copy, or keep yours and save it over that copy.",
      };
    }
    if (!response.ok) {
      const message = serverMessage(payload, "Draft sync failed.");
      // A 4xx is the server refusing this draft, so retrying the same content will not help:
      // autosave waits for the next edit instead of resending it every 12 s.
      if (response.status < 500 && response.status !== 429) {
        set(
          changed()
            ? { status: "Unsaved changes", saveIssue: null }
            : { status: "Not saved", saveIssue: { reason: message, retry: false } },
        );
        return { ok: false, status: response.status, message, ...withDetails(payload) };
      }
      throw Object.assign(new Error(message), { status: response.status });
    }
    const saved = {
      ...payload.data,
      content: parsePortfolioContent(payload.data.content),
    } as CloudPortfolioDraft;
    const unsaved = changed();
    set({
      draft: saved,
      status: unsaved ? "Unsaved changes" : "Saved",
      saveIssue: null,
      isDirty: unsaved,
      message: "",
    });
    return { ok: true, message: "Draft saved.", draft: saved };
  } catch (error) {
    const reason =
      error instanceof Error && error.name !== "AbortError" && error.name !== "TimeoutError"
        ? error.message
        : "Draft sync failed.";
    const offline = !(error as { status?: number }).status;
    set({
      status: "Not saved",
      saveIssue: { reason: offline ? "Could not reach VeriWorkly." : reason, retry: true },
    });
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

  const store = createStore<PortfolioStoreState>()(
    subscribeWithSelector((set, get) => ({
      content: createDefaultPortfolio(),
      slug: defaultSubdomain(),
      draft: null,
      publication: null,
      billing: { canPublish: false, status: "INACTIVE" },
      user: null,
      status: "Saved",
      saveIssue: null,
      message: "",
      ready: false,
      workspaceState: "loading",
      isDirty: false,
      selectedPageId: null,
      guestDraft: null,

      updateSlug: (slug) =>
        set((state) => ({
          slug: normalizeSlug(slug),
          ...touched(state),
        })),
      setMessage: (message) => set({ message }),
      setSelectedPageId: (id) => set({ selectedPageId: id }),

      updateContent: (patch) =>
        set((state) => ({
          content: { ...state.content, ...patch },
          ...touched(state),
        })),

      updateIdentity: (patch) =>
        set((state) => ({
          content: {
            ...state.content,
            identity: { ...state.content.identity, ...patch },
          },
          ...touched(state),
        })),

      applyMasterProfileImport: (nextContent) =>
        set((state) => ({
          content: nextContent,
          ...touched(state),
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
              ...touched(state),
            };
          }
          return {
            content: { ...state.content, sections: updateSections(state.content.sections) },
            ...touched(state),
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
              ...touched(state),
            };
          }
          return {
            content: { ...state.content, sections: mutateSections(state.content.sections) },
            ...touched(state),
          };
        }),

      addSection: (type) =>
        set((state) => {
          const page = state.selectedPageId
            ? state.content.pages?.find((p) => p.id === state.selectedPageId)
            : undefined;
          if ((page ?? state.content).sections.length >= PORTFOLIO_LIMITS.sections) return {};
          const newSection: PortfolioSection = {
            id: createId("section"),
            type,
            title: sectionMeta[type].label,
            subtitle: sectionMeta[type].subtitle,
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
              ...touched(state),
            };
          }
          return {
            content: { ...state.content, sections: [...state.content.sections, newSection] },
            ...touched(state),
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
              ...touched(state),
            };
          }
          return {
            content: {
              ...state.content,
              sections: state.content.sections.filter((item) => item.id !== id),
            },
            ...touched(state),
          };
        }),

      addPage: (slug, title, sections = []) =>
        set((state) => {
          if ((state.content.pages?.length ?? 0) >= PORTFOLIO_LIMITS.pages) return {};
          const newPage: PortfolioPage = {
            id: createId("page"),
            slug,
            title,
            sections,
          };
          return {
            content: {
              ...state.content,
              pages: [...(state.content.pages || []), newPage],
            },
            ...touched(state),
          };
        }),

      removePage: (id) =>
        set((state) => ({
          content: {
            ...state.content,
            pages: (state.content.pages || []).filter((page) => page.id !== id),
          },
          selectedPageId: state.selectedPageId === id ? null : state.selectedPageId,
          ...touched(state),
        })),

      hydrateWorkspace: (bootstrap) => set(buildHydratedState(bootstrap)),

      loadWorkspace: async () => {
        // Re-entrancy guard: a double-mount effect (React StrictMode, a fast
        // remount, etc.) firing this twice in a row must not race two
        // concurrent loads — the second one piggybacks on the first instead
        // of duplicating the fetch and the "no cloud draft yet" auto-save.
        if (loadWorkspaceInFlight) return loadWorkspaceInFlight;

        loadWorkspaceInFlight = (async () => {
          // Read, never shown in place of the account's draft: a load that then failed left
          // the guest's content on screen as if it were the account's.
          const cached = loadPortfolioCache();
          set({ workspaceState: "loading" });
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
            const [userPayload, portfolioPayload] = await Promise.all([
              response
                .json()
                .then((r) => r.data)
                .catch(() => null)
                .then((data) => {
                  if (!data) throw new Error("Could not load your portfolio workspace.");
                  return data;
                }),
              fetchPayload("/portfolios/me", "Could not load your portfolio workspace."),
            ]);
            const user = userPayload ?? null;
            const cloud = portfolioPayload?.data?.draft;

            const cloudDraft = cloud
              ? ({
                  ...cloud,
                  content: parsePortfolioContent(cloud.content),
                } as CloudPortfolioDraft)
              : null;
            const contentToSet = cloudDraft?.content ?? createDefaultPortfolio(user ?? undefined);
            const slugToSet = cloudDraft?.slug ?? defaultSubdomain(user);

            // A guest draft in this browser may be someone else's (a shared computer), so it is
            // never carried into the account unasked: the owner chooses (`keepGuestDraft`,
            // `discardGuestDraft`). One that matches the cloud copy has nothing to offer.
            // An untouched default has nothing in it either, and bringing it in would blank the
            // account's draft.
            const nothingToOffer =
              !!cached &&
              (isUntouchedDefault(cached.content) ||
                (!!cloudDraft &&
                  cached.slug === cloudDraft.slug &&
                  JSON.stringify(cached.content) === JSON.stringify(cloudDraft.content)));
            if (nothingToOffer) clearPortfolioCache();

            set({
              user,
              draft: cloudDraft,
              content: contentToSet,
              slug: slugToSet,
              guestDraft:
                cached && !nothingToOffer
                  ? { content: cached.content, slug: cached.slug, replacesCloud: !!cloudDraft }
                  : null,
              publication: portfolioPayload?.data?.publication ?? null,
              billing: portfolioPayload?.data?.billing ?? { canPublish: false, status: "INACTIVE" },
              message: "",
              workspaceState: "ready",
              ready: true,
            });

            // A new account gets its first draft now. No caller is waiting on this save, so its
            // failure goes to the notice.
            if (!cloudDraft) {
              void get()
                .saveDraft()
                .then((result) => {
                  if (!result.ok) set({ message: result.message });
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
                message: "",
                workspaceState: "ready",
                status: "Saved",
                ready: true,
              });
              return;
            }

            set({
              status: "Not saved",
              saveIssue: { reason: "Your workspace did not load.", retry: false },
              workspaceState: "error",
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
        const before = get().status;
        set({ status: "Publish pending" });
        const saved = await get().saveDraft();
        if (!saved.ok || !saved.draft) {
          // A save that returned before sending (a workspace that did not load) left the status
          // on "Publishing..." for good.
          if (get().status === "Publish pending") set({ status: before });
          return saved;
        }
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
              ...withDetails(payload),
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

      resolveConflict: async (keep) => {
        let cloud: CloudPortfolioDraft | null;
        try {
          const payload = await fetchPayload("/portfolios/me", "Could not load the cloud copy.");
          cloud = payload?.data?.draft
            ? { ...payload.data.draft, content: parsePortfolioContent(payload.data.draft.content) }
            : null;
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : "Could not load the cloud copy.",
          };
        }
        if (keep === "cloud") {
          if (!cloud) return { ok: false, message: "There is no cloud copy to load." };
          set({
            draft: cloud,
            content: cloud.content,
            slug: cloud.slug,
            isDirty: false,
            status: "Saved",
            saveIssue: null,
          });
          return { ok: true, message: "Loaded the cloud copy." };
        }
        // Keep mine: this content, saved at the revision the cloud copy has now, overwriting it.
        set({ draft: cloud, isDirty: true, status: "Unsaved changes", saveIssue: null });
        return get().saveDraft();
      },

      keepGuestDraft: async () => {
        const guest = get().guestDraft;
        if (!guest) return { ok: true, message: "" };
        set((state) => ({
          content: guest.content,
          // Every guest starts on "my-portfolio", so bringing that in would collide, and a
          // reserved one like "portfolio" is refused: keep the account's own then.
          slug:
            isAllowedSubdomain(guest.slug) && guest.slug !== defaultSubdomain(null)
              ? guest.slug
              : state.slug,
          guestDraft: null,
          ...touched(state),
        }));
        const result = await get().saveDraft();
        if (result.ok) clearPortfolioCache();
        return result;
      },

      discardGuestDraft: () => {
        clearPortfolioCache();
        set({ guestDraft: null });
      },

      ...preloaded,
    })),
  );

  // A selected page that is gone (a cloud copy or guest draft loaded without it) sent every
  // section edit nowhere, so the editor goes back to Home.
  store.subscribe(
    (state) => state.content.pages,
    (pages) => {
      const { selectedPageId } = store.getState();
      if (selectedPageId && !pages?.some((page) => page.id === selectedPageId)) {
        store.setState({ selectedPageId: null });
      }
    },
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
