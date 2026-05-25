import { describe, expect, it, beforeEach } from "vitest";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { useResumeStore } from "@/features/resume/store/resume-store";
import type { ResumeData } from "@/types/resume";

function cloneResume(resume: ResumeData): ResumeData {
  return JSON.parse(JSON.stringify(resume)) as ResumeData;
}

describe("resume store", () => {
  beforeEach(() => {
    useResumeStore.getState().setResume(cloneResume(defaultResume));
  });

  it("allows education entries to be cleared completely", () => {
    const { education } = useResumeStore.getState().resume;

    expect(education.length).toBeGreaterThan(0);

    for (let index = education.length - 1; index >= 0; index -= 1) {
      useResumeStore.getState().removeEducation(index);
    }

    expect(useResumeStore.getState().resume.education).toEqual([]);

    useResumeStore.getState().removeEducation(0);

    expect(useResumeStore.getState().resume.education).toEqual([]);
  });

  it("allows skill groups to be cleared completely", () => {
    const { skills } = useResumeStore.getState().resume;

    expect(skills.length).toBeGreaterThan(0);

    for (let index = skills.length - 1; index >= 0; index -= 1) {
      useResumeStore.getState().removeSkillGroup(index);
    }

    expect(useResumeStore.getState().resume.skills).toEqual([]);

    useResumeStore.getState().removeSkillGroup(0);

    expect(useResumeStore.getState().resume.skills).toEqual([]);
  });
});
