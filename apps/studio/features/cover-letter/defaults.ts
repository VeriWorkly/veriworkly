import type { BaseDocument } from "@/features/documents/core/types";

import type { CoverLetterContent } from "./types";

export const COVER_LETTER_TEMPLATE_ID = "professional";

export function createDefaultCoverLetter(id: string): BaseDocument<CoverLetterContent> {
  const now = new Date().toISOString();
  return {
    id,
    type: "COVER_LETTER",
    title: "Product Engineer - Veriworkly",
    templateId: COVER_LETTER_TEMPLATE_ID,

    updatedAt: now,

    sync: {
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    },

    content: {
      senderName: "Veriworkly User",
      senderTitle: "Product Engineer",
      senderEmail: "user@veriworkly.com",
      senderPhone: "+1 (555) 010-2026",
      senderLocation: "Remote",
      senderWebsite: "veriworkly.com",
      links: {
        displayMode: "icon-username",
        items: [],
      },

      date: new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),

      recipientName: "Veriworkly Hiring Team",
      recipientTitle: "Product and Engineering",

      companyName: "Veriworkly",
      companyLocation: "Remote",

      jobTitle: "Product Engineer",
      subject: "Application for Product Engineer at Veriworkly",

      greeting: "Dear Veriworkly Hiring Team,",

      opening:
        "I am excited to apply for the Product Engineer role at Veriworkly. The product mission is close to the work I care about: helping people present credible professional documents, move faster through career workflows, and keep their materials consistent across resume, cover letter, and document experiences.",

      body: "I would bring a practical product engineering mindset to Veriworkly. I enjoy building polished document editors, export flows, cloud sync, sharing, and preview experiences that feel dependable for real users. I care about details like autosave behavior, hydration-safe rendering, reusable document actions, and templates that help users start with strong defaults instead of a blank page.\n\nVeriworkly stands out because it combines user-facing craft with systems that need to be trustworthy: local drafts, public links, document exports, and collaboration between dashboard and editor surfaces. I would be excited to help make those workflows sharper, faster, and easier to maintain.",

      highlights:
        "- Built React and TypeScript document workflows with live preview, export, and autosave behavior\n- Improved shared UI actions so resumes, cover letters, and other documents behave consistently\n- Debugged hydration, routing, and local-storage edge cases in Next.js applications",

      closing: "Sincerely,",
      signature: "Veriworkly User",

      postscript:
        "I would welcome the chance to help Veriworkly make professional document creation feel faster, clearer, and more reliable.",

      appearance: {
        fontFamily: "geist",
        pageMargin: 40,
        paragraphSpacing: 10,
        lineHeight: 1.5,
        accentColor: "#2563eb",
        sidebarColor: "#f8fafc",
        pageColor: "#ffffff",
        textColor: "#18181b",
        hiddenSections: [],
      },
    },
  };
}

export function createEmptyCoverLetter(id: string): BaseDocument<CoverLetterContent> {
  const now = new Date().toISOString();
  const defaultDoc = createDefaultCoverLetter(id);
  return {
    ...defaultDoc,
    title: "Untitled Cover Letter",
    updatedAt: now,
    content: {
      ...defaultDoc.content,

      senderName: "",
      senderTitle: "",
      senderEmail: "",
      senderPhone: "",
      senderLocation: "",
      senderWebsite: "",

      links: {
        displayMode: "icon-username",
        items: [],
      },

      date: new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),

      recipientName: "",
      recipientTitle: "",
      companyName: "",
      companyLocation: "",
      jobTitle: "",
      subject: "",
      greeting: "",
      opening: "",
      body: "",
      highlights: "",
      closing: "",
      signature: "",
      postscript: "",
    },
  };
}
