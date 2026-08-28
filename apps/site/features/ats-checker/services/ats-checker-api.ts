import { backendApiUrl, fetchApiData } from "@/utils/fetchApiData";
import type { AtsQuota } from "../types";
import { normalizeCheckResult, type WireCheckResult } from "./normalize-report";

export async function runAtsCheck(input: { resume: unknown; jobDescription?: string }) {
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
  return payload.data.text as string;
}
