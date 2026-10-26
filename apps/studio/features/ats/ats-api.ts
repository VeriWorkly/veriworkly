import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";
import type { AtsLayoutSignals, AtsQuota, AtsResult, ConvertedResume } from "@/features/ats/types";
import { describePaidActionError, type PaidActionError } from "@/features/credits/credit-errors";

/** The uploaded file's name and size, for the file advice. Never scored. */
export type AtsFileInfo = { name: string; bytes: number };

export function runAtsCheck(input: {
  resume: unknown;
  jobDescription?: string;
  layout?: AtsLayoutSignals;
  file?: AtsFileInfo;
}) {
  return fetchApiData<AtsResult>("/ats/check", { method: "POST", body: JSON.stringify(input) });
}

export function getAtsQuota() {
  return fetchApiData<AtsQuota>("/ats/quota");
}

export function runAtsAnalysis(input: {
  resume: unknown;
  jobDescription?: string;
  jobUrl?: string;
  fetchJobUrl: boolean;
  requestId: string;
  layout?: AtsLayoutSignals;
  file?: AtsFileInfo;
  /** Opt in to AI parse repair. It runs, and is charged, only when the parse came back thin. */
  repairParse?: boolean;
}) {
  return fetchApiData<AtsResult>("/ats/analyze", { method: "POST", body: JSON.stringify(input) });
}

/** Multipart: `fetchApiData` leaves the Content-Type to FormData. A 429 carries the quota. */
export function extractResumeFile(file: File) {
  const body = new FormData();
  body.append("resume", file);

  // `layout` carries the page geometry measured during parsing; see AtsLayoutSignals.
  return fetchApiData<{ text: string; layout?: AtsLayoutSignals; quota: AtsQuota }>(
    "/ats/extract",
    { method: "POST", body, errorMessage: "Resume file could not be read." },
  );
}

export function convertResumeWithAi(input: { resume: string; requestId: string }) {
  // `replayed`: a retry answered from the stored result, charged once (V-192).
  return fetchApiData<{ resume: ConvertedResume; creditsSpent: number; replayed?: boolean }>(
    "/ats/convert-resume",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

function formatWait(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function isQuota(value: unknown): value is AtsQuota {
  return typeof (value as AtsQuota | null)?.resetsAt === "string";
}

/**
 * A failed scan, upload or conversion as the user should read it. A 429 carries the quota in
 * `details`, so the message says when the allowance comes back and the caller can refresh the
 * "Scans left" figure instead of leaving it stale.
 */
export function describeAtsError(
  error: unknown,
  fallback: string,
  now = Date.now(),
): PaidActionError & { quota?: AtsQuota } {
  if (error instanceof ApiRequestError && error.status === 429 && isQuota(error.details)) {
    const wait = formatWait(Date.parse(error.details.resetsAt) - now);
    return {
      message: `${error.message} Resets in ${wait}.`,
      buyCredits: false,
      quota: error.details,
    };
  }

  return describePaidActionError(error, fallback);
}
