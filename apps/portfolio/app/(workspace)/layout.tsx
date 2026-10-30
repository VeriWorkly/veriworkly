import { loadWorkspaceBootstrap } from "@/lib/workspace-bootstrap";

import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { WorkspaceUnavailable } from "@/components/WorkspaceUnavailable";

/**
 * The portfolio store lives here, above both `/editor` and the dashboard routes, so it
 * survives navigation between them. Mounting a provider per route group instead would
 * give each a fresh store, discarding in-memory edits that had not yet hit the 12s
 * autosave when the user left the editor.
 *
 * Analytics is deliberately *not* fetched at this level — see `(dashboard)/layout.tsx`.
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await loadWorkspaceBootstrap();

  // No store and no cache access at all: nothing can seed or overwrite the user's draft.
  if (bootstrap.apiUnavailable) return <WorkspaceUnavailable />;

  return <WorkspaceProvider initialData={bootstrap}>{children}</WorkspaceProvider>;
}
