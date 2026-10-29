import { fetchApiData } from "@/utils/fetchApiData";
import type { AtsCheckResult, AtsLayoutSignals, AtsQuota } from "../types";

export function runAtsCheck(input: {
  resume: unknown;
  jobDescription?: string;
  layout?: AtsLayoutSignals;
  file?: { name: string; bytes: number };
}) {
  return fetchApiData<AtsCheckResult>("/ats/check", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAtsQuota() {
  return fetchApiData<AtsQuota>("/ats/quota");
}

/** The server's upload limit (apps/server/src/routes/ats.ts, multer fileSize). */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** `/ats/check` refuses longer text with a bare 400 (apps/server/src/validators/atsValidator.ts). */
export const MAX_RESUME_CHARS = 50_000;
export const MAX_JOB_DESCRIPTION_CHARS = 20_000;

/** `/ats/check` parses at most 256 KB of JSON (apps/server/src/app.ts); this leaves room for the posting. */
export const MAX_JSON_RESUME_BYTES = 200 * 1024;

export async function extractResumeFile(file: File, signal: AbortSignal) {
  const body = new FormData();
  body.append("resume", file);

  // `layout` goes back with the scan so format checks see the real layout; without it those checks are skipped, not passed.
  return fetchApiData<{ text: string; layout?: AtsLayoutSignals; quota?: AtsQuota }>(
    "/ats/extract",
    // fetchApiData drops its own timeout when given a signal, so the 30 s budget rides along.
    { method: "POST", body, signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) },
  );
}
