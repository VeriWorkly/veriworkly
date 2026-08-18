import dynamic from "next/dynamic";

import type { MasterProfileData } from "@veriworkly/profile-core";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import type { BaseDocument, ExportFormat } from "./types";
import type { DocumentType } from "./document-types";
import type { DocumentDefinition, DocumentExporter, DocumentImportDraft } from "./definition";

import { templateCatalogByType } from "./template-catalog";

import {
  createDefaultCoverLetter,
  createCoverLetterFromProfile,
  COVER_LETTER_TEMPLATE_ID,
} from "@/features/cover-letter/defaults";
import { parseCoverLetterDocument } from "@/features/cover-letter/schema";
import { importCoverLetterJson } from "@/features/cover-letter/import";

import { parseResumeDataInput } from "@/features/resume/schemas/resume-storage-schema";
import {
  deriveResumeFromMasterProfile,
  loadMasterProfileFromLocalStorage,
} from "@/features/resume/services/master-profile";

const ResumeEditor = dynamic(() => import("@/features/resume/editor/ResumeEditor"));
const CoverLetterEditor = dynamic(() => import("@/features/cover-letter/editor/CoverLetterEditor"));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The one place a new resume is constructed.
 *
 * It derives from the user's master profile rather than cloning `defaultResume`. Every
 * ordinary creation route — the sidebar's "New document", `/editor?type=resume`,
 * `/editor/resume/new`, and the post-delete fallback — reaches this through
 * `createDocument`, so building generic starter content here is what made the master
 * profile effectively unreachable: users filled one in and still got placeholder text.
 *
 * `master` is the profile the caller resolved, which for the async entry points means the
 * database copy. When it is absent this falls back to the device's local cache, which in
 * turn falls back to the `defaultResume`-derived starter profile — so a guest still gets
 * usable sample content and a signed-in user on a device that has opened /profile/master
 * still gets their own data even through a synchronous call.
 *
 * Sync state is intentionally left at the derived value: `createDocument` overwrites it
 * from `workspaceSettings.autoSyncEnabled` immediately afterwards, and that setting must win.
 */
function wrapResumeDocument(id: string, master?: MasterProfileData): BaseDocument {
  const profile = master ?? loadMasterProfileFromLocalStorage().profile;
  const resume = deriveResumeFromMasterProfile(id, profile);

  return {
    id: resume.id,
    type: "RESUME",
    title: resume.title || resume.basics.fullName || "Resume",
    templateId: resume.templateId,
    content: resume,
    updatedAt: resume.updatedAt,
    sync: resume.sync,
  };
}

/**
 * A new cover letter, seeded from the profile when there is one.
 *
 * No local-cache fallback here, unlike the resume above. The studio's cached fallback
 * profile is `defaultResume`'s placeholder content, and a letter is signed: projecting
 * "VeriWorkly User" into the signature and sender block would put a name on a document that
 * is not the user's. With no profile the demo letter is the honest answer — it reads as
 * sample content, which is what it is.
 */
function wrapCoverLetterDocument(
  id: string,
  master?: MasterProfileData,
): BaseDocument<CoverLetterContent> {
  return master ? createCoverLetterFromProfile(id, master) : createDefaultCoverLetter(id);
}

function parseResumeDocument(input: unknown): BaseDocument | null {
  const document = isRecord(input) ? input : {};
  const resumeInput = isRecord(document.content) ? document.content : input;
  const resume = parseResumeDataInput(resumeInput);

  if (!resume) return null;

  const id = typeof document.id === "string" ? document.id : resume.id;
  const templateId =
    typeof document.templateId === "string" ? document.templateId : resume.templateId;
  const updatedAt = typeof document.updatedAt === "string" ? document.updatedAt : resume.updatedAt;
  const sync = isRecord(document.sync) ? { ...resume.sync, ...document.sync } : resume.sync;

  const content = {
    ...resume,
    id,
    templateId,
    updatedAt,
    sync,
  };

  return {
    id,
    type: "RESUME",
    title:
      (typeof document.title === "string" && document.title) || content.basics.fullName || "Resume",
    templateId,
    content,
    updatedAt,
    sync,
  };
}

/**
 * Resume side of `DocumentDefinition.importJson`.
 *
 * `parseResumeDocument` already accepts both an envelope and a bare `ResumeData` body —
 * which is what "Export → JSON" writes for a resume — and runs the zod schema, so this
 * only has to drop the identity fields the draft shape must not carry.
 */
function importResumeJson(raw: unknown): DocumentImportDraft<ResumeData> | null {
  const parsed = parseResumeDocument(raw);

  if (!parsed) return null;

  return {
    title: parsed.title,
    templateId: parsed.templateId,
    content: parsed.content as ResumeData,
  };
}

function describeResume(document: BaseDocument): string {
  const resume = document.content as ResumeData;
  return resume.basics?.role || "Role not set";
}

function describeCoverLetter(document: BaseDocument): string {
  const content = document.content as Partial<CoverLetterContent>;

  return (
    [content.jobTitle, content.companyName].filter(Boolean).join(" at ") ||
    content.subject ||
    "Cover letter"
  );
}

/**
 * Both loaders are `import()`ed, not statically imported. That boundary is what keeps
 * `@react-pdf/renderer` and `docx` out of the list/editor route bundles — see
 * export-dispatcher.tsx. Do not "simplify" these into top-level imports.
 */
async function loadResumeExporter(format: ExportFormat): Promise<DocumentExporter> {
  const { exportResumeDocument } = await import("@/features/documents/export/resume-exporters");
  return (document, options) => exportResumeDocument(document, format, options);
}

async function loadCoverLetterExporter(format: ExportFormat): Promise<DocumentExporter> {
  const { exportCoverLetterDocument } =
    await import("@/features/documents/export/cover-letter-exporters");
  return (document) => exportCoverLetterDocument(document, format);
}

export const documentRegistry: Record<DocumentType, DocumentDefinition> = {
  RESUME: {
    type: "RESUME",
    label: "Resume",
    icon: "FileText",
    defaultTemplateId: "executive-clarity",
    exportFormats: ["pdf", "docx", "html", "markdown", "json", "txt"],
    templates: templateCatalogByType.RESUME,
    createDefault: wrapResumeDocument,
    parse: parseResumeDocument,
    importJson: importResumeJson,
    describe: describeResume,
    Editor: ResumeEditor,
    loadExporter: loadResumeExporter,
  },

  COVER_LETTER: {
    type: "COVER_LETTER",
    label: "Cover Letter",
    icon: "Mail",
    defaultTemplateId: COVER_LETTER_TEMPLATE_ID,
    exportFormats: ["pdf", "docx", "html", "markdown", "txt", "json"],
    templates: templateCatalogByType.COVER_LETTER,
    createDefault: wrapCoverLetterDocument,
    parse: parseCoverLetterDocument,
    importJson: importCoverLetterJson,
    describe: describeCoverLetter,
    Editor: CoverLetterEditor,
    loadExporter: loadCoverLetterExporter,
  },
};

export function getDocumentDefinition(type: DocumentType) {
  return documentRegistry[type];
}
