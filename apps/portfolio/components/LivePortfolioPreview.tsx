"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { PencilLine } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { parsePortfolioContent, type PortfolioContent, type TemplateId } from "@/lib/portfolio";
import { templateLoaders } from "@/template-library/registry";
import { Watermark } from "@/components/Watermark";
import { loadPortfolioCache } from "@/lib/portfolio-storage";

const templates = Object.fromEntries(
  Object.entries(templateLoaders).map(([id, loader]) => [id, dynamic(loader)]),
) as Record<TemplateId, React.ComponentType<{ project: PortfolioContent }>>;

/**
 * What the preview renders, by the live site's rules (P-059): the badge shows unless the owner
 * has paid portfolio access and turned it off, and a selected sub-page shows that page's sections.
 */
export function previewProject(content: PortfolioContent, pageId: string | null) {
  const page = pageId ? content.pages?.find((item) => item.id === pageId) : undefined;

  return page ? { ...content, sections: page.sections } : content;
}

export function showsBadge(content: PortfolioContent, canPublish: boolean) {
  return !(canPublish && content.removeWatermark);
}

/**
 * Only the editor that framed this preview may drive it: same origin, and sent by the parent
 * window. Another same-origin tab or frame could otherwise post content into it (S4).
 */
export function isEditorMessage(
  event: Pick<MessageEvent, "origin" | "source" | "data">,
  self: { location: { origin: string }; parent: unknown },
) {
  return (
    event.origin === self.location.origin &&
    event.source === self.parent &&
    event.data?.type === "veriworkly:portfolio-preview"
  );
}

/** Opened in its own tab (Preview), not inside the editor's preview frame. */
export function isStandalone(self: { parent: unknown }) {
  return self.parent === self;
}

/**
 * A guest's draft lives only in this browser, so the server renders the default. Opened on its
 * own (Preview, not the editor's frame, which posts the live content), it shows the saved draft.
 */
export function standaloneGuestContent(self: { parent: unknown }) {
  return isStandalone(self) ? (loadPortfolioCache()?.content ?? null) : null;
}

const noSubscription = () => () => {};

/**
 * Back to the editor from a full-page preview. Bottom right, raised clear of the templates' own
 * corner widgets (Signal's theme switch), and above template chrome such as Cipher's full-screen
 * window (z-index 1000).
 */
export function OpenEditorButton() {
  return (
    <Link
      href="/editor"
      className="fixed right-4 bottom-24 z-1100 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(0,0,0,0.3)] backdrop-blur-md backdrop-saturate-150 transition hover:-translate-y-0.5 hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-8"
    >
      <PencilLine size={16} aria-hidden="true" />
      Open in editor
    </Link>
  );
}

export function LivePortfolioPreview({
  initialContent,
  canPublish,
  guest = false,
}: {
  initialContent: PortfolioContent;
  canPublish: boolean;
  guest?: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [pageId, setPageId] = useState<string | null>(null);
  // False on the server, so the button never shows inside the editor's frame, even for a moment.
  const standalone = useSyncExternalStore(
    noSubscription,
    () => isStandalone(window),
    () => false,
  );

  useEffect(() => {
    const cached = guest ? standaloneGuestContent(window) : null;
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setContent(cached);
  }, [guest]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!isEditorMessage(event, window)) return;
      setContent((current) => parsePortfolioContent(event.data.content, current));
      setPageId(typeof event.data.pageId === "string" ? event.data.pageId : null);
    };

    window.addEventListener("message", receive);

    return () => window.removeEventListener("message", receive);
  }, []);

  const Template = templates[content.templateId];
  if (!Template) return null;

  return (
    <>
      <Template project={previewProject(content, pageId)} />
      {showsBadge(content, canPublish) ? <Watermark /> : null}
      {standalone ? <OpenEditorButton /> : null}
    </>
  );
}
