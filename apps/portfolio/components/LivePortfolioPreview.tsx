"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { parsePortfolioContent, type PortfolioContent, type TemplateId } from "@/lib/portfolio";
import { templateLoaders } from "@/template-library/registry";

const templates = Object.fromEntries(
  Object.entries(templateLoaders).map(([id, loader]) => [id, dynamic(loader)]),
) as Record<TemplateId, React.ComponentType<{ project: PortfolioContent }>>;

export function LivePortfolioPreview({ initialContent }: { initialContent: PortfolioContent }) {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== "veriworkly:portfolio-preview"
      )
        return;
      setContent((current) => parsePortfolioContent(event.data.content, current));
    };

    window.addEventListener("message", receive);

    return () => window.removeEventListener("message", receive);
  }, []);

  const Template = templates[content.templateId];
  if (!Template) return null;

  return <Template project={content} />;
}
