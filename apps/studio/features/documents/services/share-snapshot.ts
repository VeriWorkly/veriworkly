import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { ShareSnapshot } from "@/features/documents/services/share-service";

import { normalizeResumeData } from "@/features/resume/utils/normalize-data";

/*
 * Reading a share snapshot is pure, and the public share page does it on the server too, to
 * render the resume into its HTML. Kept out of `share-service.ts`, a client module the
 * server cannot call into.
 */

export type SharedDocumentView =
  | { kind: "resume"; resume: ResumeData }
  | { kind: "cover-letter"; content: CoverLetterContent; templateId: string }
  | { kind: "unsupported" }
  | { kind: "empty" };

/**
 * Reads a public snapshot: a document envelope, or the bare `ResumeData` that links made
 * before snapshots carried the envelope still hold.
 */
export function readShareSnapshot(snapshot: unknown): SharedDocumentView {
  if (!snapshot || typeof snapshot !== "object") return { kind: "empty" };

  if (!("type" in snapshot) || !("content" in snapshot)) {
    return { kind: "resume", resume: normalizeResumeData(snapshot as Partial<ResumeData>) };
  }

  const envelope = snapshot as ShareSnapshot;

  if (!envelope.content) return { kind: "empty" };

  if (envelope.type === "RESUME") {
    return { kind: "resume", resume: normalizeResumeData(envelope.content as Partial<ResumeData>) };
  }

  if (envelope.type === "COVER_LETTER") {
    return {
      kind: "cover-letter",
      content: envelope.content as CoverLetterContent,
      templateId: envelope.templateId,
    };
  }

  return { kind: "unsupported" };
}
