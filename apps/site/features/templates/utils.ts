import type { TemplateSummary } from "@/config/templates";
import { siteConfig } from "@/config/site";

const portfolioBaseUrl =
  process.env.PORTFOLIO_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://portfolio.localhost:3004"
    : "https://portfolio.veriworkly.com");

export const getTemplateHref = (template: Pick<TemplateSummary, "documentType" | "id">) => {
  return `/templates/${template.documentType}/${template.id}`;
};

export const buildEditorUrl = (
  template: Pick<TemplateSummary, "editorTemplateId" | "documentType">,
) => {
  // The portfolio dashboard ignores ?template= (W-059), so the visitor's choice used to be
  // dropped silently. The portfolio app's own page for the template keeps it in view and
  // carries that app's start button.
  if (template.documentType === "portfolio-website") {
    return `${portfolioBaseUrl}/templates/${encodeURIComponent(template.editorTemplateId)}`;
  }

  const base = siteConfig.links.app;

  return `${base}/editor?template=${encodeURIComponent(template.editorTemplateId)}&type=${encodeURIComponent(template.documentType)}`;
};

export const buildPreviewUrl = (
  template: Pick<TemplateSummary, "editorTemplateId" | "documentType">,
) => {
  if (template.documentType === "portfolio-website") {
    return `${portfolioBaseUrl}/templates/${template.editorTemplateId}/preview`;
  }

  return null;
};

/** "Cover Letter" -> "Cover letter templates": headings on the page are sentence case. */
export const templatesHeading = (label: string) =>
  `${label.charAt(0)}${label.slice(1).toLowerCase()} templates`;
