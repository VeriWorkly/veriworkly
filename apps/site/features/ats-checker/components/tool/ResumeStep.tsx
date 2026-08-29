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
          <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {wordCount.toLocaleString()} words &middot; ready to scan
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          aria-label="Remove resume"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
            mode === "upload"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
            mode === "paste"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          Paste text
        </button>
      </div>

      {mode === "upload" ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) onFile(file);
          }}
          className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragOver
              ? "border-blue-500 bg-blue-500/5"
              : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
            className="sr-only"
          />
          {busy ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Reading document…
              </p>
            </div>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white">
                Drop your resume here, or{" "}
                <span className="text-blue-600 dark:text-blue-400">browse</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                PDF, DOCX, TXT, or MD &middot; processed in memory &middot; nothing stored
              </p>
            </>
          )}
        </label>
      ) : (
        <div className="space-y-3">
          <textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            rows={9}
            placeholder="Paste your resume text here…"
            className="w-full rounded-2xl border border-zinc-300 bg-white p-4 font-mono text-xs leading-relaxed text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-white/2 dark:text-white"
          />
          <button
            type="button"
            disabled={!pasteValue.trim()}
            onClick={() => onPaste(pasteValue)}
            className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Use this resume text
          </button>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default ResumeStep;
