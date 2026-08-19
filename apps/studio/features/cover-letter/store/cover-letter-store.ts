"use client";

import { create } from "zustand";

import type { MasterProfileData } from "@veriworkly/profile-core";

import type { ResumeLinkItem } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";
import type {
  CoverLetterAppearance,
  CoverLetterContent,
  CoverLetterSectionId,
} from "@/features/cover-letter/types";

import {
  createDefaultCoverLetter,
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
 * storage result so callers can surface quota failures. Cover letters previously used
 * a local `useState` hook instead, which is why they had no quota handling and a
 * different autosave shape from the resume editor.
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

/**
 * Derives the document title from the target role and company, matching how the
 * document library describes a cover letter. Falls back to the existing title so a
 * user-edited title is never overwritten by a blank target.
 */
function deriveTitle(document: CoverLetterDocument, content: CoverLetterContent): string {
  const derived = [content.jobTitle, content.companyName].filter(Boolean).join(" - ");
  return derived || document.title;
}

function withTimestamp(document: CoverLetterDocument): CoverLetterDocument {
  return { ...document, updatedAt: new Date().toISOString() };
}

export const useCoverLetterStore = create<CoverLetterStoreState>((set, get) => ({
  document: null,

  setDocument: (document) => set({ document }),

  hydrateFromStorage: (documentId) => {
    const stored = loadDocumentById("COVER_LETTER", documentId) as CoverLetterDocument | null;

    if (!stored) return false;

    set({ document: stored });
    return true;
  },

  saveToStorage: (options) => {
    const document = get().document;

    if (!document) return { ok: false, reason: "unknown" };

    return saveDocument(document, options);
  },

  /*
   * Reset restores what a NEW letter looks like, which since the projection landed means
   * the profile-seeded one. Restoring the demo letter instead would overwrite the user's
   * own name and contact details with "Veriworkly User" — worse than the state they were
   * trying to get back to. `emptyDocument` below still clears everything, including the
   * identity block, for a genuinely blank page.
   */
  resetDocument: (master) =>
    set((state) => {
      if (!state.document) return state;

      const reset = master
        ? createCoverLetterFromProfile(state.document.id, master)
        : createDefaultCoverLetter(state.document.id);

      return {
        document: withTimestamp({ ...reset, sync: state.document.sync }),
      };
    }),

  emptyDocument: () =>
    set((state) => {
      if (!state.document) return state;

      const empty = createEmptyCoverLetter(state.document.id);

      return {
        document: withTimestamp({ ...empty, sync: state.document.sync }),
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
      id: `cover-link-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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
