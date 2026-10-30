"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { PortfolioAnalyticsData, PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import {
  buildHydratedState,
  createPortfolioStore,
  PortfolioStoreProvider,
  usePortfolioStore,
} from "@/store/portfolio-store";
import { loadPortfolioCache } from "@/lib/portfolio-storage";
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

  useEffect(() => {
    if (initialData.user || initialData.workspace) {
      // A guest draft left in this browser was made before signing in. `loadWorkspace` carries
      // it into the account when it is newer than the cloud copy; the server seed knows nothing
      // of it, and its blank default would otherwise be autosaved over the guest's work.
      if (initialData.user && loadPortfolioCache()) void load();
      else if (initialData.workspace)
        hydrate({ ...initialData, analytics: initialData.analytics ?? null });
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

  const user = usePortfolioStore((state) => state.user);
  const draft = usePortfolioStore((state) => state.draft);
  const ready = usePortfolioStore((state) => state.ready);
  const billing = usePortfolioStore((state) => state.billing);
  const publication = usePortfolioStore((state) => state.publication);

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

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider");

  return context;
}

/**
 * Analytics is provided separately from the workspace because only the dashboard routes
 * render it. Keeping it out of the shared provider is what lets `/editor` skip that
 * query entirely rather than blocking its first byte on a number it never displays.
 */
const AnalyticsContext = createContext<PortfolioAnalyticsData | null>(null);

export function AnalyticsProvider({
  children,
  analytics,
}: {
  children: React.ReactNode;
  analytics: PortfolioAnalyticsData | null;
}) {
  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
