import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";
import type { DocumentExportOptions } from "@/features/documents/core/definition";

import { getDocumentDefinition } from "@/features/documents/core/registry";

/**
 * Exports a document in the requested format.
 *
 * Type dispatch lives in `DocumentDefinition.loadExporter` rather than a `switch`
 * here, for two reasons:
 *
 *  1. Bundle size. Each type's handlers sit behind a dynamic `import()`, so nothing
 *     that merely lists or edits documents pulls in `@react-pdf/renderer` (~1.8MB)
 *     or `docx` (~390KB), and exporting a resume never loads the cover letter
 *     templates.
 *  2. Extensibility. A new document type registers its own exporter in the registry;
 *     it cannot silently fall through to another type's handler, which is what the
 *     previous `if (RESUME) … else assume cover letter` shape allowed.
 *
 * This module intentionally has no heavy static imports — keep it that way.
 *
 * This is now the *only* way any surface reaches an exporter. The resume editor used to
 * carry a parallel `useToolbarDownloads` hook that imported the six format modules itself,
 * which meant `resume-exporters.tsx` — the registry-registered handler — never ran for the
 * editor at all, and the two paths had already drifted apart on HTML output and analytics.
 */
export async function exportDocumentByType(
  document: BaseDocument,
  format: ExportFormat,
  options?: DocumentExportOptions,
): Promise<void> {
  const definition = getDocumentDefinition(document.type);

  if (!definition.exportFormats.includes(format)) {
    throw new Error(`${definition.label} cannot be exported as ${format}`);
  }

  const exporter = await definition.loadExporter(format);

  return exporter(document, options);
}
