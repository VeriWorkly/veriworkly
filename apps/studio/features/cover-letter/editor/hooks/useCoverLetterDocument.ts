"use client";

import { useEffect, useState } from "react";

import type { ResumeLinkItem } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterAppearance, CoverLetterContent } from "@/features/cover-letter/types";

import {
  saveDocument,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";
import { hydrateCloudDocumentByIdToLocalStorage } from "@/features/documents/services/document-sync";

function loadCoverLetter(documentId: string) {
  return loadDocumentById("COVER_LETTER", documentId) as BaseDocument<CoverLetterContent> | null;
}

export function useCoverLetterDocument(documentId: string) {
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState("Autosave ready");

  const [doc, setDoc] = useState<BaseDocument<CoverLetterContent> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const localDocument = loadCoverLetter(documentId);

      if (!cancelled && localDocument) {
        setDoc(localDocument);
        setHydrated(true);
        return;
      }

      const cloudResult = await hydrateCloudDocumentByIdToLocalStorage("COVER_LETTER", documentId);

      if (!cancelled && cloudResult.ok) {
        setDoc(loadCoverLetter(documentId));
        setHydrated(true);
        return;
      }

      if (cancelled) return;
      setDoc(null);
      setHydrated(true);
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  function updateDocument(
    next: BaseDocument<CoverLetterContent>,
    options: { debounceMs?: number; flush?: boolean } = { debounceMs: 300 },
  ) {
    setDoc(next);
    saveDocument(next, options);
    setMessage("Saved locally");
  }

  function saveCurrentDocument() {
    if (!doc) return;

    saveDocument(doc, { flush: true });
    setMessage("Draft saved locally");
  }

  function updateContent(patch: Partial<CoverLetterContent>) {
    if (!doc) return;

    const content = doc.content;

    updateDocument({
      ...doc,
      title:
        patch.jobTitle || patch.companyName
          ? [patch.jobTitle ?? content.jobTitle, patch.companyName ?? content.companyName]
              .filter(Boolean)
              .join(" - ") || doc.title
          : doc.title,
      updatedAt: new Date().toISOString(),
      content: { ...content, ...patch },
    });
  }

  function updateAppearance(patch: Partial<CoverLetterAppearance>) {
    if (!doc) return;

    updateContent({
      appearance: {
        ...doc.content.appearance,
        ...patch,
      },
    });
  }

  function updateLinks(patch: Partial<CoverLetterContent["links"]>) {
    if (!doc) return;

    const links = doc.content.links ?? { displayMode: "icon-username" as const, items: [] };
    updateContent({ links: { ...links, ...patch } });
  }

  function addLink() {
    if (!doc) return;

    const links = doc.content.links ?? { displayMode: "icon-username" as const, items: [] };
    const next: ResumeLinkItem = {
      id: `cover-link-${Date.now().toString(36)}`,
      type: "linkedin",
      label: "",
      url: "",
    };

    updateLinks({ items: [...links.items, next] });
  }

  function updateLink(index: number, patch: Partial<ResumeLinkItem>) {
    if (!doc) return;

    const links = doc.content.links ?? { displayMode: "icon-username" as const, items: [] };
    updateLinks({
      items: links.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeLink(index: number) {
    if (!doc) return;

    const links = doc.content.links ?? { displayMode: "icon-username" as const, items: [] };
    updateLinks({ items: links.items.filter((_, itemIndex) => itemIndex !== index) });
  }

  return {
    doc,
    hydrated,
    message,
    setMessage,
    updateDocument,
    updateContent,
    updateAppearance,
    updateLinks,
    addLink,
    updateLink,
    removeLink,
    saveCurrentDocument,
  };
}
