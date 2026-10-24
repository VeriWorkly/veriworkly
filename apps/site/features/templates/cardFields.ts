import type { TemplateSummary } from "@/config/templates";

/**
 * The fields a gallery card and the explorer's search read. The explorer is a client
 * component, so whatever the page passes it is serialized into the RSC payload; the full
 * summaries also carry SEO copy, section outlines and design notes it never shows (W-034).
 */
const CARD_FIELDS = [
  "id",
  "name",
  "documentType",
  "documentTypeLabel",
  "editorTemplateId",
  "family",
  "layout",
  "previewImage",
  "shortDescription",
  "accentColor",
  "tags",
  "audience",
] as const;

export type TemplateCardData = Pick<TemplateSummary, (typeof CARD_FIELDS)[number]>;

export const toCardData = (template: TemplateSummary): TemplateCardData =>
  Object.fromEntries(CARD_FIELDS.map((key) => [key, template[key]])) as TemplateCardData;
