"use client";

import { useMemo } from "react";

import { useResumeStore } from "@/features/resume/store/resume-store";

export function useSections() {
  const sections = useResumeStore((state) => state.resume.sections);
  const selectedSection = useResumeStore((state) => state.selectedSection);

  // Store keeps user order as data. Hook returns sorted view for nav consumers.
  const orderedSections = useMemo(
    () => [...sections].sort((left, right) => left.order - right.order),
    [sections],
  );

  return {
    sections: orderedSections,
    selectedSection,
  };
}
