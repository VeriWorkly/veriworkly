import { backendApiUrl, fetchApiData } from "@/utils/fetchApiData";
import type { AtsLayoutSignals, AtsQuota } from "../types";
import { normalizeCheckResult, type WireCheckResult } from "./normalize-report";

export async function runAtsCheck(input: {
  resume: unknown;
  jobDescription?: string;
  layout?: AtsLayoutSignals;
}) {
  return normalizeCheckResult(
    await fetchApiData<WireCheckResult>("/ats/check", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export function getAtsQuota() {
  return fetchApiData<AtsQuota>("/ats/quota");
}

export async function extractResumeFile(file: File) {
  const body = new FormData();
  body.append("resume", file);
  const response = await fetch(backendApiUrl("/ats/extract"), {
    method: "POST",
    credentials: "include",
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Resume file could not be read.");

  /**
   * `layout` is the page geometry measured while parsing — column splitting and ruled tables.
   * It travels with the extracted text and is sent back with the scan, so the format checks can
   * run against the document as it was laid out rather than only against the text that fell out
   * of it. Absent for formats with no geometry to read, in which case those checks are skipped
   * rather than assumed to pass.
   */
  return payload.data as { text: string; layout?: AtsLayoutSignals };
}
