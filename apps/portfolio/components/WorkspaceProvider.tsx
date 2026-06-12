"use client";

import { createContext, useContext, useEffect } from "react";

import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import { usePortfolioStore } from "@/store/portfolio-store";

interface WorkspaceContextType {
  user: PortfolioWorkspaceBootstrap["user"];
  workspace: PortfolioWorkspaceBootstrap["workspace"];
  analytics: PortfolioWorkspaceBootstrap["analytics"];
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: WorkspaceContextType;
}) {
  const load = usePortfolioStore((state) => state.loadWorkspace);
  const hydrate = usePortfolioStore((state) => state.hydrateWorkspace);

  // Hydrate the Zustand store with the server-fetched data or trigger client load if null
  useEffect(() => {
    if (initialData.workspace) hydrate(initialData);
    else void load();
  }, [hydrate, initialData, load]);

  // Read state reactively from Zustand store so that any client-side loading updates the context dynamically
  const user = usePortfolioStore((state) => state.user);
  const draft = usePortfolioStore((state) => state.draft);
  const ready = usePortfolioStore((state) => state.ready);
  const billing = usePortfolioStore((state) => state.billing);
  const publication = usePortfolioStore((state) => state.publication);
  const analyticsData = usePortfolioStore((state) => state.analyticsData);

  const contextValue = {
    user,
    workspace: ready ? { draft, publication, billing } : null,
    analytics: analyticsData,
  };

  return <WorkspaceContext.Provider value={contextValue}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider");

  return context;
}
