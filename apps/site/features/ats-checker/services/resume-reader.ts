import { ApiRequestError } from "@/utils/fetchApiData";

import type { AtsLayoutSignals, AtsQuota } from "../types";
import { MAX_RESUME_BYTES, extractResumeFile } from "./ats-checker-api";
import { readJsonResume } from "./json-resume";

export type ResumeFileOutcome =
  | {
      ok: true;
      /** Text, or a JSON Resume / ats-resume document the engine reads field by field. */
      input: string | Record<string, unknown>;
      words: number;
      layout?: AtsLayoutSignals;
      quota?: AtsQuota;
    }
  | { ok: false; error: string; quota?: AtsQuota };

const TOO_LITTLE_TEXT =
  "This file appears to contain very little readable text. Please try pasting the text.";

export function wordCountOf(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function isQuota(value: unknown): value is AtsQuota {
  return (
    typeof value === "object" &&
    value !== null &&
    "remaining" in value &&
    "limit" in value &&
    "resetsAt" in value
  );
}

async function readResumeFile(file: File, signal: AbortSignal): Promise<ResumeFileOutcome> {
  if (file.name.toLowerCase().endsWith(".json")) {
    const read = await readJsonResume(file);
    if (!read.ok) return read;
    const words = wordCountOf(read.text);
    return words < 30
      ? { ok: false, error: TOO_LITTLE_TEXT }
      : { ok: true, input: read.input, words };
  }

  if (file.size > MAX_RESUME_BYTES)
    return {
      ok: false,
      error: "That file is over 5 MB. Export a smaller PDF, or paste the text instead.",
    };

  try {
    const { text, layout, quota } = await extractResumeFile(file, signal);
    const words = wordCountOf(text);
    return words < 30
      ? { ok: false, error: TOO_LITTLE_TEXT, quota }
      : { ok: true, input: text, words, layout, quota };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 429)
      // The upload quota sends its summary; the per-IP rate limiter sends none.
      return isQuota(err.details)
        ? {
            ok: false,
            quota: err.details,
            error: "You have used your file uploads for now. Paste the text instead, or try later.",
          }
        : {
            ok: false,
            error: "Too many requests from this connection. Wait a minute and try again.",
          };

    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not read this resume file.",
    };
  }
}

/**
 * One file read at a time, each one a paid `/ats/extract` call: a second file while one is read
 * is ignored, and pasting, removing the resume or leaving the page cancels the read so a late
 * answer cannot replace what the visitor chose since.
 */
export function createResumeReader() {
  let current: AbortController | null = null;

  return {
    get busy() {
      return current !== null;
    },

    /** Resolves to null when the read was refused (one already running) or cancelled. */
    async read(file: File): Promise<ResumeFileOutcome | null> {
      if (current) return null;
      const controller = new AbortController();
      current = controller;

      try {
        const outcome = await readResumeFile(file, controller.signal).catch(
          (): ResumeFileOutcome => ({ ok: false, error: "Could not read this resume file." }),
        );
        return controller.signal.aborted ? null : outcome;
      } finally {
        if (current === controller) current = null;
      }
    },

    cancel() {
      current?.abort();
      current = null;
    },
  };
}
