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
      <div className="bg-card flex items-center gap-4 rounded-2xl p-4">
        <span className="bg-success/10 text-success flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{sourceLabel}</p>
          <p className="text-muted text-sm tabular-nums">
            {wordCount.toLocaleString()} words &middot; ready to scan
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-muted hover:bg-background hover:text-foreground focus-visible:ring-accent/40 flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
          className={`focus-visible:ring-accent/40 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none ${
            mode === "upload" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
          }`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`focus-visible:ring-accent/40 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none ${
            mode === "paste" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
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
          className={`bg-card focus-within:ring-accent/40 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors focus-within:ring-2 ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-foreground/15 hover:border-foreground/30"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Cleared so picking the same file again after an error fires another change.
              e.target.value = "";
              if (file) onFile(file);
            }}
            className="sr-only"
          />
          {busy ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="text-accent h-7 w-7 animate-spin" aria-hidden="true" />
              <p className="text-base font-semibold">Reading document…</p>
            </div>
          ) : (
            <>
              <span className="bg-background flex h-12 w-12 items-center justify-center rounded-2xl">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-semibold">
                Drop your resume here, or{" "}
                <span className="text-accent underline underline-offset-4">browse</span>
              </p>
              <p className="text-muted mt-1 text-sm">
                PDF, DOCX, TXT, MD or JSON, up to 5 MB &middot; processed in memory &middot; nothing
                stored
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
            className="border-border bg-card placeholder:text-muted focus:border-accent/40 focus:ring-accent/20 w-full rounded-2xl border p-4 text-base leading-7 focus:ring-4 focus:outline-none"
          />
          <button
            type="button"
            disabled={!pasteValue.trim()}
            onClick={() => onPaste(pasteValue)}
            className="bg-foreground text-background hover:bg-accent hover:text-accent-foreground inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            Use this resume text
          </button>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-destructive flex items-center gap-2 text-sm font-medium">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default ResumeStep;
