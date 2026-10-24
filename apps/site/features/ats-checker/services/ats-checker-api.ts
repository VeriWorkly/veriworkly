import { fetchApiData } from "@/utils/fetchApiData";
import type { AtsCheckResult, AtsLayoutSignals, AtsQuota } from "../types";

export function runAtsCheck(input: {
  resume: unknown;
  jobDescription?: string;
  layout?: AtsLayoutSignals;
  /** The uploaded file's name and size, for the file advice (never scored). */
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

/**
 * Through fetchApiData like every other call, so it gets the timeout, the typed error and the
 * server's details (W-049). It used to be a bare fetch: no timeout, a raw "Failed to fetch",
 * and the upload quota the server returns was thrown away.
 */
export async function extractResumeFile(file: File) {
  const body = new FormData();
  body.append("resume", file);

  const data = await fetchApiData<{ text: string; layout?: AtsLayoutSignals; quota?: AtsQuota }>(
    "/ats/extract",
    { method: "POST", body, timeoutMs: 30_000 },
  );

  /**
   * `layout` is the page geometry measured while parsing — column splitting and ruled tables.
   * It travels with the extracted text and is sent back with the scan, so the format checks can
   * run against the document as it was laid out rather than only against the text that fell out
   * of it. Absent for formats with no geometry to read, in which case those checks are skipped
   * rather than assumed to pass.
   */
  return data;
}
