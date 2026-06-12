import { fetchApiData } from "@/utils/fetchApiData";
import type { AtsResult } from "@/features/ats/types";
import { backendApiUrl } from "@/lib/constants";

export function runAtsCheck(input: { resume: unknown; jobDescription?: string }) {
  return fetchApiData<AtsResult>("/ats/check", { method: "POST", body: JSON.stringify(input) });
}

export function runAtsAnalysis(input: {
  resume: unknown;
  jobDescription?: string;
  jobUrl?: string;
  fetchJobUrl: boolean;
  requestId: string;
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
  return payload.data.text as string;
}
