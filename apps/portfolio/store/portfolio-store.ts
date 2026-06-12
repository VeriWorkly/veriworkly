"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  createDefaultPortfolio,
  createId,
  normalizeSlug,
  parsePortfolioContent,
  type CloudPortfolioDraft,
  type PortfolioContent,
  type PortfolioSection,
  type PortfolioSectionType,
} from "@/lib/portfolio";
import { loadPortfolioCache, savePortfolioCache } from "@/lib/portfolio-storage";

export type SaveStatus =
  | "Saving"
  | "Saved"
  | "Offline"
  | "Conflict"
  | "Publish pending"
  | "Unsaved changes";
export type WorkspaceState = "loading" | "ready" | "error";
export type Publication = { subdomain: string; status: "LIVE" | "GRACE" | "SUSPENDED" } | null;
export type Billing = { canPublish: boolean; status: string; graceEndsAt?: string | null };
export type EditorPanel = "profile" | "sections" | "style" | "sharing";
export type PortfolioAnalyticsData = {
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
  if (!response.ok) throw new Error(payload.message || fallbackMessage);
  return payload;
}

interface PortfolioStoreState {
  content: PortfolioContent;
  slug: string;
  draft: CloudPortfolioDraft | null;
  publication: Publication;
  billing: Billing;
  analytics: number;
  user: { name?: string | null; email?: string | null } | null;
  analyticsData: PortfolioAnalyticsData | null;
  status: SaveStatus;
  message: string;
  ready: boolean;
  workspaceState: WorkspaceState;
  previewIssue: string;
  activePanel: EditorPanel;
  isDirty: boolean;

  // Setters
  setContent: (content: PortfolioContent) => void;
  setSlug: (slug: string) => void;
  updateSlug: (slug: string) => void;
  setDraft: (draft: CloudPortfolioDraft | null) => void;
  setPublication: (publication: Publication) => void;
  setBilling: (billing: Billing) => void;
  setAnalytics: (analytics: number) => void;
  setStatus: (status: SaveStatus) => void;
  setMessage: (message: string) => void;
  setReady: (ready: boolean) => void;
  setWorkspaceState: (workspaceState: WorkspaceState) => void;
  setPreviewIssue: (previewIssue: string) => void;
  setActivePanel: (activePanel: EditorPanel) => void;
  setIsDirty: (isDirty: boolean) => void;

  // State Updaters
  updateContent: (patch: Partial<PortfolioContent>) => void;
  updateIdentity: (patch: Partial<PortfolioContent["identity"]>) => void;
  updateSection: (id: string, patch: Partial<PortfolioSection>) => void;
  moveSection: (index: number, direction: -1 | 1) => void;
  addSection: (type: PortfolioSectionType) => void;
  removeSection: (id: string) => void;

  // Async Actions
  loadWorkspace: () => Promise<void>;
  hydrateWorkspace: (initialData: PortfolioWorkspaceBootstrap) => void;
  saveDraft: () => Promise<CloudPortfolioDraft | null>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioStoreState>()(
  subscribeWithSelector((set, get) => ({
    content: createDefaultPortfolio(),
    slug: "portfolio",
    draft: null,
    publication: null,
    billing: { canPublish: false, status: "INACTIVE" },
    analytics: 0,
    user: null,
    analyticsData: null,
    status: "Saved",
    message: "",
    ready: false,
    workspaceState: "loading",
    previewIssue: "",
    activePanel: "profile",
    isDirty: false,

    setContent: (content) => set({ content }),
    setSlug: (slug) => set({ slug }),
    updateSlug: (slug) =>
      set((state) => ({
        slug,
        isDirty: state.ready ? true : state.isDirty,
        status: state.ready ? "Unsaved changes" : state.status,
      })),
    setDraft: (draft) => set({ draft }),
    setPublication: (publication) => set({ publication }),
    setBilling: (billing) => set({ billing }),
    setAnalytics: (analytics) => set({ analytics }),
    setStatus: (status) => set({ status }),
    setMessage: (message) => set({ message }),
    setReady: (ready) => set({ ready }),
    setWorkspaceState: (workspaceState) => set({ workspaceState }),
    setPreviewIssue: (previewIssue) => set({ previewIssue }),
    setActivePanel: (activePanel) => set({ activePanel }),
    setIsDirty: (isDirty) => set({ isDirty }),

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
      set((state) => ({
        content: {
          ...state.content,
          sections: state.content.sections.map((section) =>
            section.id === id ? { ...section, ...patch } : section,
          ),
        },
        isDirty: state.ready ? true : state.isDirty,
        status: state.ready ? "Unsaved changes" : state.status,
      })),

    moveSection: (index, direction) =>
      set((state) => {
        const sections = [...state.content.sections];
        const target = index + direction;
        if (target < 0 || target >= sections.length) return {};
        [sections[index], sections[target]] = [sections[target], sections[index]];
        return {
          content: { ...state.content, sections },
          isDirty: state.ready ? true : state.isDirty,
          status: state.ready ? "Unsaved changes" : state.status,
        };
      }),

    addSection: (type) =>
      set((state) => {
        const label = type[0].toUpperCase() + type.slice(1);
        return {
          content: {
            ...state.content,
            sections: [
              ...state.content.sections,
              { id: createId("section"), type, title: label, visible: true, items: [] },
            ],
          },
          isDirty: state.ready ? true : state.isDirty,
          status: state.ready ? "Unsaved changes" : state.status,
        };
      }),

    removeSection: (id) =>
      set((state) => ({
        content: {
          ...state.content,
          sections: state.content.sections.filter((item) => item.id !== id),
        },
        isDirty: state.ready ? true : state.isDirty,
        status: state.ready ? "Unsaved changes" : state.status,
      })),

    hydrateWorkspace: ({ user, workspace, analytics }) => {
      const cloud = workspace?.draft as CloudPortfolioDraft | undefined;
      const restored = cloud
        ? ({ ...cloud, content: parsePortfolioContent(cloud.content) } as CloudPortfolioDraft)
        : null;
      const content = restored?.content ?? createDefaultPortfolio(user ?? undefined);
      const slug = restored?.slug ?? (normalizeSlug(user?.name || "portfolio") || "portfolio");

      if (restored) savePortfolioCache(restored);

      set({
        user,
        draft: restored,
        content,
        slug,
        publication: workspace?.publication ?? null,
        billing: workspace?.billing ?? { canPublish: false, status: "INACTIVE" },
        analytics: analytics?.totalViews ?? 0,
        analyticsData: analytics,
        message: workspace ? "" : "Could not load your portfolio workspace.",
        previewIssue: "",
        workspaceState: workspace ? "ready" : "error",
        status: workspace ? "Saved" : "Offline",
        ready: true,
        isDirty: false,
      });
    },

    loadWorkspace: async () => {
      const cached = loadPortfolioCache();
      if (cached) {
        set({ content: cached.content, slug: cached.slug });
      }
      set({ workspaceState: "loading", previewIssue: "" });
      try {
        const [userPayload, portfolioPayload, analyticsPayload] = await Promise.all([
          fetchPayload("/users/me", "Could not load your account.").catch(() => null),
          fetchPayload("/portfolios/me", "Could not load your portfolio workspace."),
          fetchPayload("/portfolios/analytics", "Could not load portfolio analytics.").catch(
            () => null,
          ),
        ]);
        const user = userPayload?.data ?? null;
        const analytics = analyticsPayload?.data ?? null;
        const cloud = portfolioPayload?.data?.draft;
        if (cloud) {
          const restored = {
            ...cloud,
            content: parsePortfolioContent(cloud.content),
          } as CloudPortfolioDraft;
          set({
            draft: restored,
            content: restored.content,
            slug: restored.slug,
          });
          savePortfolioCache(restored);
        } else if (!cached) {
          const seeded = createDefaultPortfolio(user);
          set({
            content: seeded,
            slug: normalizeSlug(user?.name || "portfolio") || "portfolio",
          });
        }
        set({
          user,
          publication: portfolioPayload?.data?.publication ?? null,
          billing: portfolioPayload?.data?.billing ?? { canPublish: false, status: "INACTIVE" },
          analytics: analytics?.totalViews ?? 0,
          analyticsData: analytics,
          message: "",
          workspaceState: "ready",
          ready: true,
        });
      } catch (error) {
        set({
          status: "Offline",
          workspaceState: "error",
          previewIssue: "Live preview is unavailable until the workspace reconnects.",
          message:
            error instanceof Error ? error.message : "Could not load your portfolio workspace.",
          ready: true,
        });
      }
    },

    saveDraft: async () => {
      const current = get();
      set({ status: "Saving" });
      savePortfolioCache({ slug: current.slug, content: current.content });
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
  })),
);
