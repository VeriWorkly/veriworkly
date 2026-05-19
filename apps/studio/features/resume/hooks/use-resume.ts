"use client";

import { useResumeStore } from "@/features/resume/store/resume-store";

export function useResume() {
  // Convenience hook for editor modules that need several store actions together.
  // Prefer narrow selectors in new high-frequency components.
  return useResumeStore();
}
