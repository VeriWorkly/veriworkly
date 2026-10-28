import type { AtsResult } from "@/features/ats/types";

/**
 * The last ATS report for each saved resume, kept for this browser tab. Leaving the ATS page
 * to fix the resume and coming back shows the report again instead of an empty panel; the tab
 * closing forgets it, and nothing about the resume leaves the device.
 */
const KEY_PREFIX = "veriworkly:ats-report:";

type StoredAtsReport = {
  /** The resume text the report was made from, to tell whether the resume changed since. */
  resumeText: string;
  result: AtsResult;
};

export type RememberedAtsReport = {
  result: AtsResult;
  /** False when the resume was edited after the scan: the report describes an older version. */
  current: boolean;
};

export function rememberAtsReport(documentId: string, resumeText: string, result: AtsResult) {
  const report: StoredAtsReport = { resumeText, result };

  try {
    window.sessionStorage.setItem(`${KEY_PREFIX}${documentId}`, JSON.stringify(report));
  } catch (error) {
    // The report is on screen already; only coming back to it later is lost.
    console.warn("The ATS report could not be kept for this tab", error);
  }
}

export function recallAtsReport(
  documentId: string,
  resumeText: string,
): RememberedAtsReport | null {
  let stored: StoredAtsReport | null;

  try {
    const raw = window.sessionStorage.getItem(`${KEY_PREFIX}${documentId}`);
    stored = raw ? (JSON.parse(raw) as StoredAtsReport) : null;
  } catch (error) {
    console.warn("The last ATS report could not be read", error);
    return null;
  }

  if (!stored?.result) return null;

  return { result: stored.result, current: stored.resumeText === resumeText };
}
