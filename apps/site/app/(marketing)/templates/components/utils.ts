import type { TemplateSummary } from "@/config/templates";

import { siteConfig } from "@/config/site";

const portfolioBaseUrl =
  process.env.PORTFOLIO_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://portfolio.localhost:3004"
    : "https://portfolio.veriworkly.com");

export function getSingleParam(value: string | string[] | undefined, fallback: string) {
  if (!value) return fallback;
  return Array.isArray(value) ? (value[0] ?? fallback) : value;
}

export function getTemplateHref(template: Pick<TemplateSummary, "documentType" | "id">) {
  return `/templates/${template.documentType}/${template.id}`;
}

export function hrefWithFilters(docType: string, family: string, layout: string) {
  const params = new URLSearchParams();

  if (family !== "All") params.set("family", family);
  if (layout !== "All") params.set("layout", layout);

  return params.toString() ? `/templates/${docType}?${params.toString()}` : `/templates/${docType}`;
}

export function buildEditorUrl(
  template: Pick<TemplateSummary, "editorTemplateId" | "documentType">,
) {
  if (template.documentType === "portfolio-website") {
    return `${portfolioBaseUrl}/dashboard?template=${encodeURIComponent(template.editorTemplateId)}`;
  }

  const base = siteConfig.links.app;

  return `${base}/editor?template=${encodeURIComponent(template.editorTemplateId)}&type=${encodeURIComponent(template.documentType)}`;
}

export function buildPreviewUrl(
  template: Pick<TemplateSummary, "editorTemplateId" | "documentType">,
) {
  if (template.documentType === "portfolio-website") {
    return `${portfolioBaseUrl}/templates/${template.editorTemplateId}/preview`;
  }

  return null;
}

export function toTitle(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
