"use client";

import type {
  ResumeData,
  ResumeBasics,
  ResumeLinkItem,
  ResumeSkillGroup,
  ResumeProjectItem,
  ResumeCustomSection,
  ResumeCustomization,
  ResumeEducationItem,
  ResumeAdditionalItem,
  ResumeExperienceItem,
  ResumeLinkDisplayMode,
} from "@/types/resume";

import { create } from "zustand";

import type { MasterProfileData } from "@veriworkly/profile-core";

import {
  createLinkItem,
  createSkillGroup,
  createProjectItem,
  createEducationItem,
  createExperienceItem,
  createCustomItem,
  createCustomSection,
  createTypedSectionItem,
  type ResumeTypedSectionKey,
  type ResumeTypedSectionItem,
} from "@/features/resume/utils/factories";
import {
  type SaveResumeResult,
  type SaveResumeOptions,
  saveResume as saveResumeToLocalStorage,
} from "@/features/resume/services/resume-service";
import { blankResume } from "@/features/resume/constants/default-resume";
import { deriveResumeFromMasterProfile } from "@/features/resume/services/master-profile";
import { getResumeSectionKey } from "@/features/documents/rendering/resume-rendering";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { reorderItems, withTimestamp } from "@/features/resume/store/resume-store-utils";

interface ResumeStoreState {
  resume: ResumeData;
  setResume: (resume: ResumeData) => void;
  saveToStorage: (options?: SaveResumeOptions) => SaveResumeResult;
  /** Back to a new resume's content: from `master` when given, blank otherwise. */
  resetResume: (master?: MasterProfileData) => SaveResumeResult;
  emptyResume: () => SaveResumeResult;
  /** Keyed by `getResumeSectionKey`, not by section id — several sections share id "custom". */
  setSectionVisibility: (sectionKey: string, visible: boolean) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  updateSectionColumn: (sectionKey: string, column: "left" | "right") => void;
  /** Renames a section heading; an empty label prints the default heading. */
  setSectionHeading: (sectionKey: string, label: string) => void;
  updateLanguage: (language: string) => void;
  setTemplateId: (templateId: string) => void;
  updateCustomization: (values: Partial<ResumeCustomization>) => void;
  updateBasics: (values: Partial<ResumeBasics>) => void;
  updateTitle: (title: string) => void;
  updateSummary: (summary: string) => void;
  updateLinkDisplayMode: (displayMode: ResumeLinkDisplayMode) => void;
  updateLinkItem: (index: number, values: Partial<ResumeLinkItem>) => void;
  addLinkItem: () => void;
  removeLinkItem: (index: number) => void;
  updateSkillGroup: (index: number, values: Partial<ResumeSkillGroup>) => void;
  addSkillGroup: () => void;
  removeSkillGroup: (index: number) => void;
  reorderSkillGroups: (fromIndex: number, toIndex: number) => void;
  /*
   * One generic API for the eight typed optional sections rather than 24 near-identical
   * actions. `key` names the array; `ResumeTypedSectionItem<K>` keeps the item type tied to
   * it, so `updateTypedItem("references", i, { date: "" })` does not compile.
   */
  addTypedItem: (key: ResumeTypedSectionKey) => void;
  updateTypedItem: <K extends ResumeTypedSectionKey>(
    key: K,
    index: number,
    values: Partial<ResumeTypedSectionItem<K>>,
  ) => void;
  removeTypedItem: (key: ResumeTypedSectionKey, index: number) => void;
  reorderTypedItem: (key: ResumeTypedSectionKey, fromIndex: number, toIndex: number) => void;
  /*
   * Custom sections are addressed by their own id, not by `kind`. Every custom section has
   * kind "custom", so a kind-keyed action could only ever reach the first one.
   */
  addCustomSection: () => void;
  removeCustomSection: (sectionId: string) => void;
  updateCustomSection: (sectionId: string, values: Partial<ResumeCustomSection>) => void;
  updateCustomSectionItem: (
    sectionId: string,
    index: number,
    values: Partial<ResumeAdditionalItem>,
  ) => void;
  addCustomSectionItem: (sectionId: string) => void;
  removeCustomSectionItem: (sectionId: string, index: number) => void;
  reorderCustomSectionItem: (sectionId: string, fromIndex: number, toIndex: number) => void;
  updateExperience: (index: number, values: Partial<ResumeExperienceItem>) => void;
  addExperience: () => void;
  removeExperience: (index: number) => void;
  reorderExperience: (fromIndex: number, toIndex: number) => void;
  updateEducation: (index: number, values: Partial<ResumeEducationItem>) => void;
  addEducation: () => void;
  removeEducation: (index: number) => void;
  reorderEducation: (fromIndex: number, toIndex: number) => void;
  updateProject: (index: number, values: Partial<ResumeProjectItem>) => void;
  addProject: () => void;
  removeProject: (index: number) => void;
  reorderProjects: (fromIndex: number, toIndex: number) => void;
}

/**
 * Reset and "Empty fields" replace what the resume says, not how it looks or what it is
 * called: template, customization, section order, visibility and headings, title, language and
 * sync linkage all carry over. The save result is returned so the caller can report a failed write.
 */
function replaceResumeContent(
  set: (partial: Pick<ResumeStoreState, "resume">) => void,
  current: ResumeData,
  next: ResumeData,
): SaveResumeResult {
  const resume = withTimestamp(
    normalizeResumeData({
      ...next,
      id: current.id,
      title: current.title,
      language: current.language,
      templateId: current.templateId,
      customization: current.customization,
      sections: current.sections,
      sync: current.sync,
    }),
  );

  set({ resume });

  return saveResumeToLocalStorage(resume);
}

export const useResumeStore = create<ResumeStoreState>((set, get) => ({
  resume: blankResume,
  setResume: (resume) => set({ resume: withTimestamp(normalizeResumeData(resume)) }),

  saveToStorage: (options) => saveResumeToLocalStorage(get().resume, options),

  resetResume: (master) => {
    const activeResume = get().resume;
    const next = master
      ? deriveResumeFromMasterProfile(activeResume.id, master)
      : { ...blankResume, id: activeResume.id };

    return replaceResumeContent(set, activeResume, next);
  },

  emptyResume: () => {
    const activeResume = get().resume;

    return replaceResumeContent(set, activeResume, {
      ...blankResume,
      id: activeResume.id,
      // The user's own custom sections stay, emptied, so their entries in `sections` still
      // point at something.
      customSections: activeResume.customSections.map((section) => ({ ...section, items: [] })),
    });
  },

  /*
   * Keyed by `getResumeSectionKey`, not by `section.id`.
   *
   * Every custom section carries the id "custom", so an id-keyed toggle would hide or show
   * all of them at once and an id-keyed column change would move all of them together.
   */
  setSectionVisibility: (sectionKey, visible) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        sections: state.resume.sections.map((section) =>
          getResumeSectionKey(section) === sectionKey ? { ...section, visible } : section,
        ),
      }),
    })),

  reorderSections: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex < 2 || toIndex < 2) {
        return {};
      }

      // Reordering acts on the sorted view the panel shows, which is not the stored array
      // order once a custom section has been appended at the end.
      const sorted = [...state.resume.sections].sort((left, right) => left.order - right.order);

      const reorderedSections = reorderItems(sorted, fromIndex, toIndex).map((section, index) => ({
        ...section,
        order: index,
      }));

      return {
        resume: withTimestamp({
          ...state.resume,
          sections: reorderedSections,
        }),
      };
    }),

  updateSectionColumn: (sectionKey, column) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        sections: state.resume.sections.map((section) =>
          getResumeSectionKey(section) === sectionKey ? { ...section, column } : section,
        ),
      }),
    })),

  setSectionHeading: (sectionKey, label) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        sections: state.resume.sections.map((section) =>
          getResumeSectionKey(section) === sectionKey ? { ...section, label } : section,
        ),
      }),
    })),

  updateLanguage: (language) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        language,
      }),
    })),

  setTemplateId: (templateId) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        templateId,
      }),
    })),

  updateCustomization: (values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customization: {
          ...state.resume.customization,
          ...values,
        },
      }),
    })),

  updateBasics: (values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        basics: {
          ...state.resume.basics,
          ...values,
        },
      }),
    })),

  updateTitle: (title) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        title,
      }),
    })),

  updateSummary: (summary) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        summary,
      }),
    })),

  updateLinkDisplayMode: (displayMode) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        links: {
          ...state.resume.links,
          displayMode,
        },
      }),
    })),

  updateLinkItem: (index, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        links: {
          ...state.resume.links,
          items: state.resume.links.items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, ...values } : item,
          ),
        },
      }),
    })),

  addLinkItem: () =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        links: {
          ...state.resume.links,
          items: [...state.resume.links.items, createLinkItem()],
        },
      }),
    })),

  removeLinkItem: (index) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        links: {
          ...state.resume.links,
          items: state.resume.links.items.filter((_, itemIndex) => itemIndex !== index),
        },
      }),
    })),

  updateSkillGroup: (index, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        skills: state.resume.skills.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...values } : item,
        ),
      }),
    })),

  addSkillGroup: () =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        skills: [...state.resume.skills, createSkillGroup()],
      }),
    })),

  removeSkillGroup: (index) =>
    set((state) => {
      if (state.resume.skills.length === 0) {
        return state;
      }

      return {
        resume: withTimestamp({
          ...state.resume,
          skills: state.resume.skills.filter((_, itemIndex) => itemIndex !== index),
        }),
      };
    }),

  reorderSkillGroups: (fromIndex, toIndex) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        skills: reorderItems(state.resume.skills, fromIndex, toIndex),
      }),
    })),

  addTypedItem: (key) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        [key]: [...state.resume[key], createTypedSectionItem(key)],
      } as ResumeData),
    })),

  updateTypedItem: (key, index, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        [key]: state.resume[key].map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...values } : item,
        ),
      } as ResumeData),
    })),

  removeTypedItem: (key, index) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        [key]: state.resume[key].filter((_, itemIndex) => itemIndex !== index),
      } as ResumeData),
    })),

  reorderTypedItem: (key, fromIndex, toIndex) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        [key]: reorderItems<ResumeTypedSectionItem<typeof key>>(
          state.resume[key],
          fromIndex,
          toIndex,
        ),
      } as ResumeData),
    })),

  addCustomSection: () =>
    set((state) => {
      const section = createCustomSection();

      return {
        resume: withTimestamp({
          ...state.resume,
          customSections: [...state.resume.customSections, section],
          // `normalizeResumeData` would add the matching section entry on the next read, but
          // the visibility panel reads live store state, so the entry is added here too or a
          // new section is invisible in it until the document reloads.
          sections: [
            ...state.resume.sections,
            {
              id: "custom" as const,
              label: section.title || "Custom",
              visible: true,
              order: state.resume.sections.length,
              customSectionId: section.id,
            },
          ],
        }),
      };
    }),

  removeCustomSection: (sectionId) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.filter((section) => section.id !== sectionId),
        sections: state.resume.sections.filter((section) => section.customSectionId !== sectionId),
      }),
    })),

  updateCustomSection: (sectionId, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.map((item) =>
          item.id === sectionId ? { ...item, ...values } : item,
        ),
        // The section entry carries the label the visibility panel shows, so a retitled
        // section has to update both or the two disagree.
        sections: state.resume.sections.map((section) =>
          section.customSectionId === sectionId && values.title !== undefined
            ? { ...section, label: values.title || "Custom" }
            : section,
        ),
      }),
    })),

  updateCustomSectionItem: (sectionId, index, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.map((section) => {
          if (section.id !== sectionId) {
            return section;
          }

          return {
            ...section,
            items: section.items.map((item, itemIndex) =>
              itemIndex === index ? { ...item, ...values } : item,
            ),
          };
        }),
      }),
    })),

  addCustomSectionItem: (sectionId) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.map((section) => {
          if (section.id !== sectionId) {
            return section;
          }

          return {
            ...section,
            items: [...section.items, createCustomItem()],
          };
        }),
      }),
    })),

  removeCustomSectionItem: (sectionId, index) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.map((section) => {
          if (section.id !== sectionId || section.items.length === 0) {
            return section;
          }

          return {
            ...section,
            items: section.items.filter((_, itemIndex) => itemIndex !== index),
          };
        }),
      }),
    })),

  reorderCustomSectionItem: (sectionId, fromIndex, toIndex) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.map((section) =>
          section.id === sectionId
            ? { ...section, items: reorderItems(section.items, fromIndex, toIndex) }
            : section,
        ),
      }),
    })),

  updateExperience: (index, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        experience: state.resume.experience.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...values } : item,
        ),
      }),
    })),

  addExperience: () =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        experience: [...state.resume.experience, createExperienceItem()],
      }),
    })),

  removeExperience: (index) =>
    set((state) => {
      if (state.resume.experience.length === 0) {
        return state;
      }

      return {
        resume: withTimestamp({
          ...state.resume,
          experience: state.resume.experience.filter((_, itemIndex) => itemIndex !== index),
        }),
      };
    }),

  reorderExperience: (fromIndex, toIndex) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        experience: reorderItems(state.resume.experience, fromIndex, toIndex),
      }),
    })),

  updateEducation: (index, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        education: state.resume.education.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...values } : item,
        ),
      }),
    })),

  addEducation: () =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        education: [...state.resume.education, createEducationItem()],
      }),
    })),

  removeEducation: (index) =>
    set((state) => {
      if (state.resume.education.length === 0) {
        return state;
      }

      return {
        resume: withTimestamp({
          ...state.resume,
          education: state.resume.education.filter((_, itemIndex) => itemIndex !== index),
        }),
      };
    }),

  reorderEducation: (fromIndex, toIndex) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        education: reorderItems(state.resume.education, fromIndex, toIndex),
      }),
    })),

  updateProject: (index, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        projects: state.resume.projects.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...values } : item,
        ),
      }),
    })),

  addProject: () =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        projects: [...state.resume.projects, createProjectItem()],
      }),
    })),

  removeProject: (index) =>
    set((state) => {
      if (state.resume.projects.length === 0) {
        return state;
      }

      return {
        resume: withTimestamp({
          ...state.resume,
          projects: state.resume.projects.filter((_, itemIndex) => itemIndex !== index),
        }),
      };
    }),

  reorderProjects: (fromIndex, toIndex) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        projects: reorderItems(state.resume.projects, fromIndex, toIndex),
      }),
    })),
}));
