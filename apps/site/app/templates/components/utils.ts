import type { TemplateSummary } from "@/config/templates";

import { siteConfig } from "@/config/site";

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
  const base = siteConfig.links.app;

  return `${base}/editor?template=${encodeURIComponent(template.editorTemplateId)}&type=${encodeURIComponent(template.documentType)}`;
}

export function toTitle(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
