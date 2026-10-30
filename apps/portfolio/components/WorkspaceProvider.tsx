"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

import type { PortfolioAnalyticsData, PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import {
  buildHydratedState,
  createPortfolioStore,
  keepEditsForSignIn,
  PortfolioStoreProvider,
  shouldAutosave,
  usePortfolioStore,
  warnOnLeave,
  usePortfolioStoreApi,
} from "@/store/portfolio-store";
import { loadPortfolioCache } from "@/lib/portfolio-storage";
import { setBeforeSignOut, setSignedIn } from "@/lib/authenticated-fetch";
import { WorkspaceNotice } from "@/components/WorkspaceNotice";

interface WorkspaceContextType {
  user: PortfolioWorkspaceBootstrap["user"];
  workspace: PortfolioWorkspaceBootstrap["workspace"];
  isAdmin: boolean;
}

export interface WorkspaceProviderData extends WorkspaceContextType {
  analytics?: PortfolioAnalyticsData | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: WorkspaceProviderData;
}) {
  // One store per mount, seeded during render with this request's own bootstrap.
  //
  // The store used to be a module-level singleton, which on the server is shared by
  // every in-flight request — so it could never hold a user's data during SSR without
  // leaking it into someone else's response. It therefore rendered empty, and the pages
  // driven by it shipped placeholder content: the settings form server-rendered the slug
  // as "portfolio" and a stock meta title, then swapped in the real values on hydration.
  //
  // Seeding is safe here because the instance is per-request, and it makes the server and
  // the first client render agree by construction — both derive from the same bootstrap.
  const [store] = useState(() =>
    createPortfolioStore(
      initialData.workspace
        ? buildHydratedState({ ...initialData, analytics: initialData.analytics ?? null })
        : undefined,
    ),
  );

  return (
    <PortfolioStoreProvider value={store}>
      <WorkspaceBridge initialData={initialData}>{children}</WorkspaceBridge>
    </PortfolioStoreProvider>
  );
}

/**
 * Lives inside the store provider so it can subscribe, and keeps the client-side
 * loading paths (guest cache, retry when the server bootstrap came back empty)
 * that the render-time seed deliberately leaves alone.
 */
function WorkspaceBridge({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: WorkspaceProviderData;
}) {
  const load = usePortfolioStore((state) => state.loadWorkspace);
  const hydrate = usePortfolioStore((state) => state.hydrateWorkspace);

  // A layout effect, so it runs before any page's own effects: the editor's `?template=` and
  // first-save effects then see the load already under way (`workspaceState` "loading") and wait
  // for it, instead of editing content the load is about to replace.
  useLayoutEffect(() => {
    if (initialData.user || initialData.workspace) {
      // A guest draft left in this browser was made before signing in. `loadWorkspace` finds it
      // and asks whether to bring it into the account; the server seed knows nothing of it.
      if (initialData.user && loadPortfolioCache()) void load();
      // The store was seeded from this same bootstrap at render; hydrating it again here
      // undid any change a page had already made.
      else if (initialData.workspace) return;
      else void load();
    } else {
      // Guest mode! Hydrate using local data only, do not load from server
      const cached = loadPortfolioCache();
      hydrate({
        user: null,
        workspace: cached
          ? {
              draft: {
                id: "guest",
                slug: cached.slug,
                templateId: cached.content.templateId,
                content: cached.content,
                revision: 1,
                updatedAt: new Date().toISOString(),
              },
              billing: { canPublish: false, status: "INACTIVE" },
              publication: null,
            }
          : null,
        analytics: null,
      });
    }
  }, [hydrate, initialData, load]);

  useDraftSafety();

  const user = usePortfolioStore((state) => state.user);
  const draft = usePortfolioStore((state) => state.draft);
  const ready = usePortfolioStore((state) => state.ready);
  const billing = usePortfolioStore((state) => state.billing);
  const publication = usePortfolioStore((state) => state.publication);

  // Only a signed-in tab may be signed out by a 401; a guest just gets an inline "Log in" prompt.
  useEffect(() => setSignedIn(!!user), [user]);

  // An expired session mid-edit goes to the login page with its edits kept in this browser.
  const store = usePortfolioStoreApi();
  useEffect(() => {
    setBeforeSignOut(() => keepEditsForSignIn(store));
    return () => setBeforeSignOut(null);
  }, [store]);

  // `ready` is already true on the first render whenever the server supplied a workspace,
  // so this normally reads from the store immediately. The fallback still matters for
  // guests, whose draft lives in localStorage and cannot be known until after mount.
  const contextValue = useMemo<WorkspaceContextType>(
    () =>
      ready
        ? { user, workspace: { draft, publication, billing }, isAdmin: initialData.isAdmin }
        : {
            user: initialData.user,
            workspace: initialData.workspace,
            isAdmin: initialData.isAdmin,
          },
    [ready, user, draft, publication, billing, initialData],
  );

  // Mounted once here so save, publish and load notices reach every workspace page.
  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
      <WorkspaceNotice />
    </WorkspaceContext.Provider>
  );
}

const AUTOSAVE_MS = 12000;

/**
 * Autosave and the leave-page warning live here, above every workspace page, so an edit made in
 * the editor keeps saving after a client-side move to the dashboard or Settings, and closing the
 * tab from any of them warns while something is unsaved (P-022).
 */
function useDraftSafety() {
  const store = usePortfolioStoreApi();

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = store.getState();
      if (!shouldAutosave(state)) return;
      // Nobody clicked anything for this save, so a failure goes to the workspace notice.
      void state.saveDraft().then((result) => {
        if (!result.ok) store.getState().setMessage(result.message);
      });
    }, AUTOSAVE_MS);
    return () => window.clearInterval(timer);
  }, [store]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!warnOnLeave(store.getState())) return;
      event.preventDefault();
      // Legacy browsers ignore preventDefault() here and instead show the
      // "leave site?" prompt only when returnValue is set to a truthy value.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [store]);
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider");

  return context;
}

/** Publishing is admin-only in production until launch. */
export function usePublishingClosed() {
  const { isAdmin } = useWorkspace();
  return process.env.NODE_ENV === "production" && !isAdmin;
}

/**
 * Analytics is provided separately from the workspace because only the dashboard routes
 * render it. Keeping it out of the shared provider is what lets `/editor` skip that
 * query entirely rather than blocking its first byte on a number it never displays.
 *
 * `unavailable` means the request failed, which is not the same as `locked`: a paying user
 * must be told to try again, not offered Creator Pro. `asOf` is the server's UTC day, so the
 * "last 30 days" window is the same in the server render and on the client.
 */
type AnalyticsState = {
  analytics: PortfolioAnalyticsData | null;
  unavailable: boolean;
  asOf?: string;
};

const AnalyticsContext = createContext<AnalyticsState>({ analytics: null, unavailable: false });

export function AnalyticsProvider({
  children,
  analytics,
  unavailable = false,
  asOf,
}: {
  children: React.ReactNode;
  analytics: PortfolioAnalyticsData | null;
  unavailable?: boolean;
  asOf?: string;
}) {
  const value = useMemo(() => ({ analytics, unavailable, asOf }), [analytics, unavailable, asOf]);
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
