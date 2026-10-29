import dynamic from "next/dynamic";

import type { MasterProfileData } from "@veriworkly/profile-core";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import type { BaseDocument, ExportFormat } from "./types";
import type { DocumentType } from "./document-types";
import type { DocumentDefinition, DocumentExporter, DocumentImportDraft } from "./definition";

import { templateCatalogByType } from "./template-catalog";

import { isRecord } from "@/lib/is-record";
import { useUserStore } from "@/store/useUserStore";

import {
  createEmptyCoverLetter,
  createDefaultCoverLetter,
  createCoverLetterFromProfile,
  COVER_LETTER_TEMPLATE_ID,
} from "@/features/cover-letter/defaults";
import { parseCoverLetterDocument } from "@/features/cover-letter/schema";
import { importCoverLetterJson } from "@/features/cover-letter/import";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import {
  parseResumeImport,
  parseResumeDataInput,
  documentSyncStateSchema,
} from "@/features/resume/schemas/resume-storage-schema";
import {
  deriveResumeFromMasterProfile,
  createEmptyStudioMasterProfile,
  loadMasterProfileFromLocalStorage,
} from "@/features/resume/services/master-profile";

const ResumeEditor = dynamic(() => import("@/features/resume/editor/ResumeEditor"));
const CoverLetterEditor = dynamic(() => import("@/features/cover-letter/editor/CoverLetterEditor"));

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
 * database copy. When it is absent this falls back to the device's local cache, so a
 * signed-in user on a device that has opened /profile/master still gets their own data even
 * through a synchronous call. With no profile anywhere, a guest's document is the sample
 * resume, so a first visit shows what a finished one looks like; a signed-in user's starts
 * blank, because whatever it holds is saved and synced as theirs.
 *
 * Sync state is intentionally left at the derived value: `createDocument` overwrites it
 * from `workspaceSettings.autoSyncEnabled` immediately afterwards, and that setting must win.
 */
function createStartingResume(id: string, master?: MasterProfileData, sample = false): ResumeData {
  const cached = sample ? null : loadMasterProfileFromLocalStorage();
  const profile = master ?? (cached?.status === "ok" ? cached.profile : undefined);

  if (profile) return deriveResumeFromMasterProfile(id, profile);

  if (useUserStore.getState().isLoggedIn) {
    return deriveResumeFromMasterProfile(id, createEmptyStudioMasterProfile());
  }

  return normalizeResumeData({
    ...structuredClone(defaultResume),
    id,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Not the person's name (the profile projection titles a resume after them): every resume
 * would carry it, so three of them read "Jane Doe" in the library. Set on the content too,
 * because saving rebuilds the envelope's title from it.
 */
const NEW_RESUME_TITLE = "Untitled resume";

function wrapResumeDocument(
  id: string,
  master?: MasterProfileData,
  options?: { sample?: boolean },
): BaseDocument {
  const resume = {
    ...createStartingResume(id, master, options?.sample),
    title: NEW_RESUME_TITLE,
  };

  return {
    id: resume.id,
    type: "RESUME",
    title: resume.title,
    templateId: resume.templateId,
    content: resume,
    updatedAt: resume.updatedAt,
    sync: resume.sync,
  };
}

/**
 * A new cover letter, seeded from the profile when there is one.
 *
 * No local-cache fallback here, unlike the resume above: a letter is signed, and only a
 * profile the caller resolved for this user may put a name on it. With no profile a guest
 * gets the sample letter, which reads as sample content; a signed-in user gets a blank one.
 */
function wrapCoverLetterDocument(
  id: string,
  master?: MasterProfileData,
): BaseDocument<CoverLetterContent> {
  if (master) return createCoverLetterFromProfile(id, master);

  return useUserStore.getState().isLoggedIn
    ? createEmptyCoverLetter(id)
    : createDefaultCoverLetter(id);
}

/** The envelope around a parsed resume body; the envelope's own fields win. */
function toResumeEnvelope(document: Record<string, unknown>, resume: ResumeData): BaseDocument {
  const id = typeof document.id === "string" ? document.id : resume.id;
  const templateId =
    typeof document.templateId === "string" ? document.templateId : resume.templateId;
  const updatedAt = typeof document.updatedAt === "string" ? document.updatedAt : resume.updatedAt;
  const envelopeSync = documentSyncStateSchema.safeParse(document.sync);
  const sync = envelopeSync.success ? { ...resume.sync, ...envelopeSync.data } : resume.sync;

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

/** Storage and sync read path: an envelope or a bare `ResumeData` body. */
function parseResumeDocument(input: unknown): BaseDocument | null {
  const document = isRecord(input) ? input : {};
  const resume = parseResumeDataInput(isRecord(document.content) ? document.content : input);

  return resume ? toResumeEnvelope(document, resume) : null;
}

/**
 * Resume side of `DocumentDefinition.importJson`.
 *
 * Accepts an envelope or a bare `ResumeData` body, which is what "Export → JSON" writes for
 * a resume, but stricter than the storage path: an envelope must say it is a resume and the
 * body must carry `basics`, so `{}` or another document type's file is refused instead of
 * becoming an empty resume. Identity fields are dropped; the draft shape must not carry them.
 */
function importResumeJson(raw: unknown): DocumentImportDraft<ResumeData> | null {
  if (!isRecord(raw)) return null;

  const isEnvelope = isRecord(raw.content);

  if (isEnvelope && raw.type !== "RESUME") return null;

  const resume = parseResumeImport(isEnvelope ? raw.content : raw);
  const parsed = resume ? toResumeEnvelope(raw, resume) : null;

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

const documentRegistry: Record<DocumentType, DocumentDefinition> = {
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
