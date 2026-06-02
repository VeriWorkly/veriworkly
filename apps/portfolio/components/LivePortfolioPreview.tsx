"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { parsePortfolioContent, type PortfolioContent } from "@/lib/portfolio";

const templates = {
  signal: dynamic(() => import("@/template-library/signal/SignalTemplate")),
  atelier: dynamic(() => import("@/template-library/atelier/AtelierTemplate")),
};

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
  return <Template project={content} />;
}
