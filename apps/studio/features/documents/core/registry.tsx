import dynamic from "next/dynamic";

import type { BaseDocument } from "./types";
import type { DocumentType } from "./document-types";
import type { DocumentDefinition } from "./definition";

import { templateCatalogByType } from "./template-catalog";

import {
  createDefaultCoverLetter,
  COVER_LETTER_TEMPLATE_ID,
} from "@/features/cover-letter/defaults";
import { parseCoverLetterDocument } from "@/features/cover-letter/schema";

import {
  createDefaultFormalLetter,
  FORMAL_LETTER_TEMPLATE_ID,
} from "@/features/formal-letter/defaults";
import { parseFormalLetterDocument } from "@/features/formal-letter/schema";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { parseResumeDataInput } from "@/features/resume/schemas/resume-storage-schema";

import { parseInvoiceDocument } from "@/features/invoice/schema";
import { createDefaultInvoice, INVOICE_TEMPLATE_ID } from "@/features/invoice/defaults";

const FormalLetterEditor = dynamic(
  () => import("@/features/formal-letter/editor/FormalLetterEditor"),
);
const InvoiceEditor = dynamic(() => import("@/features/invoice/editor/InvoiceEditor"));
const ResumeEditor = dynamic(() => import("@/app/(main)/editor/components/EditorLayout"));
const CoverLetterEditor = dynamic(() => import("@/features/cover-letter/editor/CoverLetterEditor"));

function wrapResumeDocument(id: string): BaseDocument {
  const now = new Date().toISOString();

  const resume = {
    ...structuredClone(defaultResume),
    id,
    updatedAt: now,
  };

  return {
    id: resume.id,
    type: "RESUME",
    title: resume.basics.fullName || "Resume",
    templateId: resume.templateId,
    content: resume,
    updatedAt: resume.updatedAt,
    sync: resume.sync,
  };
}

function parseResumeDocument(input: unknown): BaseDocument | null {
  const resume = parseResumeDataInput(input);

  if (!resume) return null;

  return {
    id: resume.id,
    type: "RESUME",
    title: resume.basics.fullName || "Resume",
    templateId: resume.templateId,
    content: resume,
    updatedAt: resume.updatedAt,
    sync: resume.sync,
  };
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
    Editor: ({ documentId }: { documentId: string }) => <ResumeEditor resumeId={documentId} />,
  },

  COVER_LETTER: {
    type: "COVER_LETTER",
    label: "Cover Letter",
    icon: "Mail",
    defaultTemplateId: COVER_LETTER_TEMPLATE_ID,
    exportFormats: ["pdf", "docx", "html", "markdown", "txt", "json"],
    templates: templateCatalogByType.COVER_LETTER,
    createDefault: createDefaultCoverLetter,
    parse: parseCoverLetterDocument,
    Editor: CoverLetterEditor,
  },

  FORMAL_LETTER: {
    type: "FORMAL_LETTER",
    label: "Formal Letter",
    icon: "ScrollText",
    defaultTemplateId: FORMAL_LETTER_TEMPLATE_ID,
    exportFormats: ["pdf", "docx", "markdown", "txt", "json"],
    templates: templateCatalogByType.FORMAL_LETTER,
    createDefault: createDefaultFormalLetter,
    parse: parseFormalLetterDocument,
    Editor: FormalLetterEditor,
  },

  INVOICE: {
    type: "INVOICE",
    label: "Invoice",
    icon: "ReceiptText",
    defaultTemplateId: INVOICE_TEMPLATE_ID,
    exportFormats: ["pdf", "json", "txt"],
    templates: templateCatalogByType.INVOICE,
    createDefault: createDefaultInvoice,
    parse: parseInvoiceDocument,
    Editor: InvoiceEditor,
  },
};

export function getDocumentDefinition(type: DocumentType) {
  return documentRegistry[type];
}
