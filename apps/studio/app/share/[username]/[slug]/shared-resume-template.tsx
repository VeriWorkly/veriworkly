import type { ReactNode } from "react";

import type { ShareLinkPayload } from "@/features/documents/services/share-service";

import { loadTemplateComponentById } from "@/templates";
import { readShareSnapshot } from "@/features/documents/services/share-snapshot";

/**
 * The shared resume drawn by its template on the server, for the page's HTML.
 *
 * The template's code is fetched on demand, so a page that resolved it in the browser served
 * a "Loading resume" spinner in its HTML: nothing on screen until the app's bundle had loaded
 * and run, and nothing for a crawler or link unfurler that runs none. The browser then cuts
 * this same markup into pages (`ResumePagedPreview`).
 *
 * Null when there is nothing to draw yet — a locked link carries no snapshot, a cover letter
 * draws itself — or when the template fails to load here; the page then loads it in the
 * browser as before, and reports a failure there.
 */
export async function renderSharedResumeTemplate(payload: ShareLinkPayload): Promise<ReactNode> {
  if (payload.passwordRequired) return null;

  const shared = readShareSnapshot(payload.snapshot);

  if (shared.kind !== "resume") return null;

  try {
    const Template = await loadTemplateComponentById(shared.resume.templateId);

    return <Template resume={shared.resume} className="" />;
  } catch (error) {
    console.error("Shared resume template failed to load on the server", error);
    return null;
  }
}
