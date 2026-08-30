import { fetchApiData } from "@/utils/fetchApiData";
import type { AtsLayoutSignals, AtsQuota, AtsResult, ConvertedResume } from "@/features/ats/types";
import { backendApiUrl } from "@/lib/constants";

export function runAtsCheck(input: {
  resume: unknown;
  jobDescription?: string;
  layout?: AtsLayoutSignals;
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
}) {
  return fetchApiData<AtsResult>("/ats/analyze", { method: "POST", body: JSON.stringify(input) });
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
  // `layout` carries the page geometry measured during parsing; see AtsLayoutSignals.
  return payload.data as { text: string; layout?: AtsLayoutSignals };
}

export function convertResumeWithAi(input: { resume: string; requestId: string }) {
  return fetchApiData<{ resume: ConvertedResume; creditsSpent: number }>("/ats/convert-resume", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
