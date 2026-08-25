"use client";

import { useState } from "react";
import { FileText, Loader2, TriangleAlert, Upload, X } from "lucide-react";

interface ResumeStepProps {
  hasResume: boolean;
  sourceLabel: string;
  wordCount: number;
  busy: boolean;
  error: string;
  onFile: (file: File) => void;
  onPaste: (text: string) => void;
  onClear: () => void;
}

export function ResumeStep({
  hasResume,
  sourceLabel,
  wordCount,
  busy,
  error,
  onFile,
  onPaste,
  onClear,
}: ResumeStepProps) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [pasteValue, setPasteValue] = useState("");
  const [dragOver, setDragOver] = useState(false);

  if (hasResume) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-white/2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {sourceLabel}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {wordCount.toLocaleString()} words loaded &middot; not stored
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Remove resume"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="How to add your resume"
        className="mb-3 flex gap-1 rounded-full bg-zinc-100 p-1 text-sm font-semibold dark:bg-white/5"
      >
        {(["upload", "paste"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            onClick={() => setMode(option)}
            className={`flex-1 rounded-full py-2 transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              mode === option
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            {option === "upload" ? "Upload file" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <label
          htmlFor="ats-file-input"
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          /**
           * The file input itself is `sr-only`, so without `focus-within` a keyboard user
           * tabbing onto it gets no visible focus at all - the ring has to be drawn by the
           * label that stands in for it visually.
           */
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/40 ${
            dragOver
              ? "border-blue-500 bg-blue-500/5"
              : "border-zinc-300 hover:border-blue-500 dark:border-zinc-700 dark:hover:border-blue-500/60"
          }`}
        >
          {busy ? (
            <Loader2
              className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
          ) : (
            <Upload className="h-7 w-7 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
          )}
          <span className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {busy ? "Reading your file…" : "Drop your resume here, or click to browse"}
          </span>
          <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            PDF, DOCX, TXT, or Markdown &middot; 5 MB max
          </span>
          <input
            id="ats-file-input"
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </label>
      ) : (
        <div>
          <label htmlFor="ats-resume-text" className="sr-only">
            Resume text
          </label>
          <textarea
            id="ats-resume-text"
            value={pasteValue}
            onChange={(event) => setPasteValue(event.target.value)}
            rows={8}
            placeholder="Paste your resume text here"
            className="w-full resize-y rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800 outline-none placeholder:text-zinc-500 focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-zinc-800 dark:bg-white/2 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => onPaste(pasteValue)}
            disabled={!pasteValue.trim()}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white dark:focus-visible:ring-offset-black"
          >
            Use this text
          </button>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-400"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : null}
    </div>
  );
}
