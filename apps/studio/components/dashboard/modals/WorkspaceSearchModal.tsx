"use client";

import { FileText, Mail, Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Modal } from "@veriworkly/ui";

import type { DocumentType } from "@/features/documents/core/document-types";
import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

import { getDocumentLibrarySnapshot } from "@/features/documents/services/document-library";

type SearchResult = {
  id: string;
  type: DocumentType;
  title: string;
  subtitle: string;
  updatedAt: string;
};

export function WorkspaceSearchModal({
  open,
  onClose,
  onOpenDocument,
}: {
  open: boolean;
  onClose: () => void;
  onOpenDocument: (doc: SearchResult) => void;
}) {
  const inputId = useId();

  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { results, libraryEmpty } = useMemo(() => {
    if (!open) return { results: [], libraryEmpty: false };

    const documents: SearchResult[] = getDocumentLibrarySnapshot().docs.map(
      (document: DocumentLibraryItem) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        subtitle: [document.templateName, document.description].filter(Boolean).join(" - "),
        updatedAt: document.updatedAt,
      }),
    );

    const needle = query.trim().toLowerCase();

    return {
      libraryEmpty: documents.length === 0,
      results: documents
        .filter((doc) => !needle || `${doc.title} ${doc.subtitle}`.toLowerCase().includes(needle))
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .slice(0, 10),
    };
  }, [open, query]);

  /** Up and down move between the field and the results, as in any search list. */
  const handleArrowKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const items = [
      document.getElementById(inputId),
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ].filter((item): item is HTMLElement => item !== null);
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? current + 1 : current - 1;

    if (next < 0 || next >= items.length) return;

    event.preventDefault();
    items[next].focus();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="overflow-hidden p-0 md:max-w-2xl" onKeyDown={handleArrowKeys}>
        <div className="border-border/70 border-b p-3">
          <Modal.Title className="sr-only">Search workspace</Modal.Title>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor={inputId}>
              Search documents
            </label>

            <div className="border-border bg-background flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3">
              <Search className="text-muted h-5 w-5 shrink-0" />

              <input
                autoFocus
                id={inputId}
                value={query}
                placeholder="Search documents"
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-base outline-none"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="text-muted hover:bg-background flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={listRef} className="max-h-104 overflow-y-auto p-2">
          {results.length > 0 ? (
            results.map((doc) => (
              <button
                type="button"
                key={`${doc.type}-${doc.id}`}
                className="hover:bg-accent/10 focus-visible:bg-accent/10 flex w-full items-center gap-3 rounded-xl p-3 text-left outline-none"
                onClick={() => {
                  onClose();
                  onOpenDocument(doc);
                }}
              >
                <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <SearchResultIcon className="h-4 w-4" type={doc.type} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{doc.title}</span>
                  <span className="text-muted block truncate text-xs">{doc.subtitle}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="font-bold">
                {libraryEmpty ? "No documents yet" : "No documents found"}
              </p>
              <p className="text-muted mt-1 text-sm">
                {libraryEmpty
                  ? "Create a resume or cover letter and it will show up here."
                  : "Try another document title."}
              </p>
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
}

function SearchResultIcon({ className, type }: { className?: string; type: DocumentType }) {
  if (type === "COVER_LETTER") {
    return <Mail aria-hidden="true" className={className} />;
  }

  return <FileText aria-hidden="true" className={className} />;
}
