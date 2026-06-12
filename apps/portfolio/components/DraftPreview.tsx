"use client";

import dynamic from "next/dynamic";
import { demoPortfolio, type TemplateId } from "@/lib/portfolio";

const templates = {
  signal: dynamic(() => import("@/template-library/signal/SignalTemplate")),
  atelier: dynamic(() => import("@/template-library/atelier/AtelierTemplate")),
};

export function DraftPreview({ templateId }: { templateId: TemplateId }) {
  const Template = templates[templateId];
  return <Template project={{ ...demoPortfolio, templateId }} />;
}
