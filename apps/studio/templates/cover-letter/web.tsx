"use client";

import type { CoverLetterContent } from "@/features/cover-letter/types";

import { createElement } from "react";

import { useTemplateComponent } from "@/templates/shared/use-template-component";

import { buildCoverLetterMarkdown, buildCoverLetterText } from "./shared";
import { coverLetterTemplateRegistry, loadCoverLetterHtmlBuilder } from "./registry";

export { buildCoverLetterMarkdown, buildCoverLetterText };
export { splitContactLinks, splitMarkdownLines, splitRichTextBlocks } from "./shared";

interface CoverLetterPreviewProps {
  content: CoverLetterContent;
  templateId: string;
}

/**
 * Renders the selected cover letter template, fetched on demand — the same lazy
 * pattern the resume preview uses (see `templates/shared/use-template-component.ts`).
 */
export function CoverLetterPreview({ content, templateId }: CoverLetterPreviewProps) {
  const Template = useTemplateComponent(coverLetterTemplateRegistry.loadWeb, templateId);

  return Template ? createElement(Template, { content }) : null;
}

/**
 * Standalone HTML for the selected template. Async because the builder lives in the
 * template module, which is loaded on demand.
 */
export function buildCoverLetterHtml(
  content: CoverLetterContent,
  templateId: string,
): Promise<string> {
  return loadCoverLetterHtmlBuilder(templateId).then((build) => build(content));
}
