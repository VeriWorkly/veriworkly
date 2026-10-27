"use client";

import { create } from "zustand";

import { createId, type MasterProfileData } from "@veriworkly/profile-core";

import type { ResumeLinkItem } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";
import type {
  CoverLetterAppearance,
  CoverLetterContent,
  CoverLetterSectionId,
} from "@/features/cover-letter/types";

import {
  createEmptyCoverLetter,
  createCoverLetterFromProfile,
} from "@/features/cover-letter/defaults";
import {
  type SaveDocumentOptions,
  type SaveDocumentResult,
} from "@/features/documents/services/local-storage-service";
import {
  saveDocument,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";

export type CoverLetterDocument = BaseDocument<CoverLetterContent>;

/**
 * Cover letter editor state.
 *
 * Deliberately the same shape as `features/resume/store/resume-store.ts`: a store
 * holding one document, granular field actions, and `saveToStorage` returning the
 * storage result so callers can surface quota failures.
 */
interface CoverLetterStoreState {
  document: CoverLetterDocument | null;

  setDocument: (document: CoverLetterDocument | null) => void;
  hydrateFromStorage: (documentId: string) => boolean;
  saveToStorage: (options?: SaveDocumentOptions) => SaveDocumentResult;

  resetDocument: (master?: MasterProfileData) => void;
  emptyDocument: () => void;

  setSectionVisibility: (section: CoverLetterSectionId, visible: boolean) => void;

  setTemplateId: (templateId: string) => void;
  updateTitle: (title: string) => void;
  updateContent: (patch: Partial<CoverLetterContent>) => void;
  updateAppearance: (patch: Partial<CoverLetterAppearance>) => void;

  updateLinks: (patch: Partial<CoverLetterContent["links"]>) => void;
  addLinkItem: () => void;
  updateLinkItem: (index: number, patch: Partial<ResumeLinkItem>) => void;
  removeLinkItem: (index: number) => void;
}

const EMPTY_LINKS: CoverLetterContent["links"] = { displayMode: "icon-username", items: [] };

const UNTITLED_TITLE = "Untitled Cover Letter";

function targetTitle(content: CoverLetterContent): string {
  return [content.jobTitle, content.companyName].filter(Boolean).join(" - ");
}

/**
 * Follows the target role and company while the title is still the derived one (or the
 * untitled placeholder). Once the user has renamed the letter, the title is theirs and no
 * edit to the target changes it.
 */
function deriveTitle(document: CoverLetterDocument, content: CoverLetterContent): string {
  const isDerived =
    !document.title ||
    document.title === UNTITLED_TITLE ||
    document.title === targetTitle(document.content);

  if (!isDerived) return document.title;

  return targetTitle(content) || UNTITLED_TITLE;
}

/**
 * Reset and "Empty fields" replace what the letter says, not how it looks or what it is
 * called: the template, the appearance (which holds the hidden sections), the language, the
 * title and the sync linkage all carry over.
 */
function replaceContent(
  current: CoverLetterDocument,
  next: CoverLetterDocument,
): CoverLetterDocument {
  return withTimestamp({
    ...current,
    content: {
      ...next.content,
      appearance: current.content.appearance,
      ...(current.content.language ? { language: current.content.language } : {}),
    },
  });
}

function withTimestamp(document: CoverLetterDocument): CoverLetterDocument {
  return { ...document, updatedAt: new Date().toISOString() };
}

export const useCoverLetterStore = create<CoverLetterStoreState>((set, get) => ({
  document: null,

  setDocument: (document) => set({ document }),

  hydrateFromStorage: (documentId) => {
    const stored = loadDocumentById("COVER_LETTER", documentId) as CoverLetterDocument | null;

    // A miss clears the store: keeping the previous letter would show (and autosave) it
    // under a URL that names a different one.
    set({ document: stored });
    return Boolean(stored);
  },

  saveToStorage: (options) => {
    const document = get().document;

    if (!document) return { ok: false, reason: "unknown" };

    return saveDocument(document, options);
  },

  /*
   * Reset restores what a NEW letter's content looks like: the profile-seeded one, or a
   * blank one without a profile. Never the sample letter, which would put a stranger's name
   * and contact details on the user's document. `emptyDocument` below clears everything,
   * including the identity block.
   */
  resetDocument: (master) =>
    set((state) => {
      if (!state.document) return state;

      const reset = master
        ? createCoverLetterFromProfile(state.document.id, master)
        : createEmptyCoverLetter(state.document.id);

      return { document: replaceContent(state.document, reset) };
    }),

  emptyDocument: () =>
    set((state) => {
      if (!state.document) return state;

      return {
        document: replaceContent(state.document, createEmptyCoverLetter(state.document.id)),
      };
    }),

  setSectionVisibility: (section, visible) =>
    set((state) => {
      if (!state.document) return state;

      const hidden = state.document.content.appearance.hiddenSections;
      const nextHidden = visible
        ? hidden.filter((id) => id !== section)
        : hidden.includes(section)
          ? hidden
          : [...hidden, section];

      return {
        document: withTimestamp({
          ...state.document,
          content: {
            ...state.document.content,
            appearance: { ...state.document.content.appearance, hiddenSections: nextHidden },
          },
        }),
      };
    }),

  setTemplateId: (templateId) =>
    set((state) =>
      state.document ? { document: withTimestamp({ ...state.document, templateId }) } : state,
    ),

  updateTitle: (title) =>
    set((state) =>
      state.document ? { document: withTimestamp({ ...state.document, title }) } : state,
    ),

  updateContent: (patch) =>
    set((state) => {
      if (!state.document) return state;

      const content = { ...state.document.content, ...patch };

      return {
        document: withTimestamp({
          ...state.document,
          title: deriveTitle(state.document, content),
          content,
        }),
      };
    }),

  updateAppearance: (patch) =>
    set((state) => {
      if (!state.document) return state;

      return {
        document: withTimestamp({
          ...state.document,
          content: {
            ...state.document.content,
            appearance: { ...state.document.content.appearance, ...patch },
          },
        }),
      };
    }),

  updateLinks: (patch) =>
    set((state) => {
      if (!state.document) return state;

      const links = state.document.content.links ?? EMPTY_LINKS;

      return {
        document: withTimestamp({
          ...state.document,
          content: { ...state.document.content, links: { ...links, ...patch } },
        }),
      };
    }),

  addLinkItem: () => {
    const document = get().document;
    if (!document) return;

    const links = document.content.links ?? EMPTY_LINKS;
    const next: ResumeLinkItem = {
      id: createId("cover-link"),
      type: "linkedin",
      label: "",
      url: "",
    };

    get().updateLinks({ items: [...links.items, next] });
  },

  updateLinkItem: (index, patch) => {
    const document = get().document;
    if (!document) return;

    const links = document.content.links ?? EMPTY_LINKS;

    get().updateLinks({
      items: links.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  },

  removeLinkItem: (index) => {
    const document = get().document;
    if (!document) return;

    const links = document.content.links ?? EMPTY_LINKS;

    get().updateLinks({ items: links.items.filter((_, itemIndex) => itemIndex !== index) });
  },
}));
