import type { DocumentType } from "@/features/documents/core/document-types";

/**
 * Usage-event name for exporting a document of `type`.
 *
 * The server allow-lists public event names (`KNOWN_EVENTS` in
 * `apps/server/src/services/analyticsService.ts`) and rejects anything else with a 400, so
 * these strings are a contract with that list — `resume_exported` is deliberately unchanged
 * because the admin metrics already have history under that name, and `cover_letter_exported`
 * was added alongside it rather than collapsing both into one generic event.
 */
export function getDocumentExportEventName(type: DocumentType): string {
  return `${type.toLowerCase()}_exported`;
}
