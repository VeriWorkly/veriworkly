"use server";

import { revalidatePath } from "next/cache";

const REFRESHABLE_PATHS = new Set([
  "/roadmap",
  "/roadmap/todo",
  "/roadmap/in-progress",
  "/roadmap/done",
]);

/**
 * Purges the cached roadmap data for a single page so the next render pulls fresh rows
 * from the backend.
 *
 * This replaces the old `?refresh=<status>` query parameter, which mapped straight onto
 * `cache: "no-store"`. That made cache-busting reachable over GET by anyone - and each
 * bypass fanned out into up to `MAX_PAGES` sequential backend calls, so a crawler or a
 * held-down refresh could amplify one URL into hundreds of upstream requests.
 *
 * A Server Action is POST-only and carries Next's built-in Origin/Host check, so it
 * cannot be triggered by a crawler or a cross-site GET. It is also strictly better
 * behaviour: `revalidatePath` refills the shared cache once, and every subsequent
 * visitor gets the fresh data, instead of one visitor paying for an uncached render
 * that nobody else benefits from.
 */
export async function refreshRoadmapPath(formData: FormData) {
  const path = formData.get("path");

  if (typeof path !== "string" || !REFRESHABLE_PATHS.has(path)) return;

  revalidatePath(path);
}
