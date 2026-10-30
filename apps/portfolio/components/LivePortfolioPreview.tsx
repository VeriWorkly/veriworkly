"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { parsePortfolioContent, type PortfolioContent, type TemplateId } from "@/lib/portfolio";
import { templateLoaders } from "@/template-library/registry";
import { Watermark } from "@/components/Watermark";

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

export function LivePortfolioPreview({
  initialContent,
  canPublish,
}: {
  initialContent: PortfolioContent;
  canPublish: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [pageId, setPageId] = useState<string | null>(null);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== "veriworkly:portfolio-preview"
      )
        return;
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
    </>
  );
}
