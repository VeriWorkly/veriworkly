"use client";

import { FileText, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { listSavedResumes } from "@/features/resume/services/resume-core";

type SearchResult = {
  id: string;
  type: "RESUME";
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
  onOpenDocument: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const results = useMemo(() => {
    if (!open) return [];

    const resumes: SearchResult[] = listSavedResumes().map((resume) => ({
      id: resume.id,
      type: "RESUME",
      title: resume.title,
      subtitle: resume.role || "Resume",
      updatedAt: resume.updatedAt,
    }));

    const needle = query.trim().toLowerCase();

    return resumes
      .filter((doc) => !needle || `${doc.title} ${doc.subtitle}`.toLowerCase().includes(needle))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .slice(0, 10);
  }, [open, query]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-80 flex items-start justify-center bg-black/45 px-4 pt-24 backdrop-blur-sm"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-search-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="border-border bg-card w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="border-border/70 border-b p-3">
          <h2 id="workspace-search-title" className="sr-only">
            Search workspace
          </h2>

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

        <div className="max-h-104 overflow-y-auto p-2">
          {results.length > 0 ? (
            results.map((doc) => (
              <button
                type="button"
                key={`${doc.type}-${doc.id}`}
                className="hover:bg-accent/10 focus-visible:bg-accent/10 flex w-full items-center gap-3 rounded-xl p-3 text-left outline-none"
                onClick={() => {
                  onClose();
                  onOpenDocument(doc.id);
                }}
              >
                <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <FileText className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{doc.title}</span>
                  <span className="text-muted block truncate text-xs">Resume - {doc.subtitle}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="font-bold">No documents found</p>
              <p className="text-muted mt-1 text-sm">Try another resume title or role.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
