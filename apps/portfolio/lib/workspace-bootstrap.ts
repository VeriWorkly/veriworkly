import "server-only";

import { cookies } from "next/headers";

import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import { SESSION_COOKIE_NAMES } from "@/proxy";
import { isAdminUser } from "@/lib/admin";
import { fetchServerApiData, ServerApiUnavailableError } from "@/lib/server-api";

export interface WorkspaceBootstrap {
  user: PortfolioWorkspaceBootstrap["user"];
  workspace: PortfolioWorkspaceBootstrap["workspace"];
  isAdmin: boolean;
  /** A signed-in request whose workspace could not be loaded. Never render guest mode for it. */
  apiUnavailable?: boolean;
}

const unavailable: WorkspaceBootstrap = {
  user: null,
  workspace: null,
  isAdmin: false,
  apiUnavailable: true,
};

/**
 * Server-side bootstrap shared by every workspace route.
 *
 * Analytics is deliberately absent: only the dashboard routes render it, and it is
 * fetched there instead so `/editor` doesn't wait on a query it never reads.
 */
export async function loadWorkspaceBootstrap(): Promise<WorkspaceBootstrap> {
  const cookieStore = await cookies();
  const hasSession = SESSION_COOKIE_NAMES.some((name) => Boolean(cookieStore.get(name)?.value));

  let user: WorkspaceBootstrap["user"];
  let workspace: WorkspaceBootstrap["workspace"];
  try {
    [user, workspace] = await Promise.all([
      fetchServerApiData<PortfolioWorkspaceBootstrap["user"]>("/users/me"),
      fetchServerApiData<PortfolioWorkspaceBootstrap["workspace"]>("/portfolios/me"),
    ]);
  } catch (error) {
    if (!(error instanceof ServerApiUnavailableError)) throw error;
    // Guest mode is only safe when there is no session to lose. A signed-in user shown it
    // during an outage would edit a local copy that the next healthy load overwrites (P-017).
    if (hasSession) return unavailable;
    return { user: null, workspace: null, isAdmin: false };
  }

  // Signed in but no workspace: seeding one from a blank portfolio would autosave it over
  // the real draft, so treat it as an outage too.
  if (user && !workspace) return unavailable;

  // The dashboard/editor stays open in production for every user — only the publish action
  // itself is blocked there for non-admins (see EditorCommandBar.tsx and the server's
  // PortfolioController.publish, which is the actual enforcement point). `isAdmin` is computed
  // here, server-side, from the server-only ADMIN_EMAIL — never send the email itself to the
  // client, only this boolean.
  return { user, workspace, isAdmin: isAdminUser(user) };
}
