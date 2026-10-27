import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyMasterProfile } from "@veriworkly/profile-core";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { useResumeStore } from "@/features/resume/store/resume-store";
import { toResumeDocument } from "@/features/resume/services/resume-core";
import { getWorkspaceStorage } from "@/features/documents/services/document-workspace-service";
import type { ResumeData } from "@/types/resume";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

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

  it("S-292: moves an entry of every list section, and ignores a move past either end", () => {
    const store = useResumeStore.getState;
    const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);

    for (let count = 0; count < 2; count += 1) {
      store().addExperience();
      store().addEducation();
      store().addProject();
      store().addSkillGroup();
      store().addTypedItem("awards");
    }
    store().addCustomSection();
    const sectionId = store().resume.customSections.at(-1)!.id;
    store().addCustomSectionItem(sectionId);
    store().addCustomSectionItem(sectionId);

    const lists = [
      [() => store().resume.experience, (f: number, t: number) => store().reorderExperience(f, t)],
      [() => store().resume.education, (f: number, t: number) => store().reorderEducation(f, t)],
      [() => store().resume.projects, (f: number, t: number) => store().reorderProjects(f, t)],
      [() => store().resume.skills, (f: number, t: number) => store().reorderSkillGroups(f, t)],
      [
        () => store().resume.awards,
        (f: number, t: number) => store().reorderTypedItem("awards", f, t),
      ],
      [
        () => store().resume.customSections.find((section) => section.id === sectionId)!.items,
        (f: number, t: number) => store().reorderCustomSectionItem(sectionId, f, t),
      ],
    ] as const;

    for (const [read, move] of lists) {
      const before = ids(read());
      expect(before.length).toBeGreaterThan(1);

      move(1, 0);
      expect(ids(read())).toEqual([before[1], before[0], ...before.slice(2)]);

      move(0, -1);
      move(before.length - 1, before.length);
      expect(ids(read())).toEqual([before[1], before[0], ...before.slice(2)]);
    }
  });
});

const LINKED_SYNC: ResumeData["sync"] = {
  enabled: true,
  status: "synced",
  cloudDocumentId: "cloud-1",
  lastSyncedAt: "2026-01-01T00:00:00.000Z",
  revision: 3,
};

describe("resume store reset and empty (S-008, S-129)", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: vi.fn(),
    });

    const linked: ResumeData = {
      ...cloneResume(defaultResume),
      id: "resume-linked",
      title: "My resume",
      language: "de",
      templateId: "modern-minimal",
      customization: { ...defaultResume.customization, accentColor: "#ff0000" },
      sections: defaultResume.sections.map((section) =>
        section.id === "projects" ? { ...section, visible: false } : section,
      ),
      sync: LINKED_SYNC,
    };

    // Stored first, as it is in the app: storage refuses to re-create a cloud-linked document
    // that is missing, because that copy was deleted elsewhere.
    getWorkspaceStorage("RESUME").persistMany([toResumeDocument(linked)]);
    useResumeStore.getState().setResume(linked);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  for (const action of ["resetResume", "emptyResume"] as const) {
    it(`S-008 S-129 S-296: ${action} keeps sync linkage, template, customization, sections, title and language`, () => {
      const result = useResumeStore.getState()[action]();
      const resume = useResumeStore.getState().resume;

      expect(result.ok).toBe(true);
      expect(resume.id).toBe("resume-linked");
      expect(resume.sync.cloudDocumentId).toBe("cloud-1");
      expect(resume.sync.revision).toBe(3);
      expect(resume.title).toBe("My resume");
      expect(resume.templateId).toBe("modern-minimal");
      expect(resume.customization.accentColor).toBe("#ff0000");
      expect(resume.language).toBe("de");
      expect(resume.sections.find((section) => section.id === "projects")?.visible).toBe(false);
    });

    it(`S-008: ${action} reports a failed save`, () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });

      expect(useResumeStore.getState()[action]().ok).toBe(false);
    });
  }

  it("S-008: reset without a master profile empties the content instead of loading sample data", () => {
    useResumeStore.getState().resetResume();

    const resume = useResumeStore.getState().resume;

    expect(resume.basics.fullName).toBe("");
    expect(resume.experience).toEqual([]);
    expect(JSON.stringify(resume)).not.toMatch(/veriworkly|gautam/i);
  });

  it("S-008: reset with a master profile takes its content", () => {
    const master = {
      ...createEmptyMasterProfile(),
      basics: { ...createEmptyMasterProfile().basics, fullName: "Ada Lovelace" },
    };

    useResumeStore.getState().resetResume(master);

    expect(useResumeStore.getState().resume.basics.fullName).toBe("Ada Lovelace");
    expect(useResumeStore.getState().resume.sync.cloudDocumentId).toBe("cloud-1");
  });
});
