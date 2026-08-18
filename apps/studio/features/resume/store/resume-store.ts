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

import {
  createLinkItem,
  createSkillGroup,
  createProjectItem,
  createEducationItem,
  createExperienceItem,
  createAdditionalItem,
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
import { defaultResume } from "@/features/resume/constants/default-resume";
import { getResumeSectionKey } from "@/features/documents/rendering/resume-rendering";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { reorderItems, withTimestamp } from "@/features/resume/store/resume-store-utils";

/*
 * No `selectedSection` / `selectSection`. Audited independently of the cover-letter store
 * rather than by assuming symmetry: nothing read either one — every panel tracks its open
 * section with local `useState` — and `resetResume`/`emptyResume` each reset a value no
 * component observed.
 */
interface ResumeStoreState {
  resume: ResumeData;
  setResume: (resume: ResumeData) => void;
  saveToStorage: (options?: SaveResumeOptions) => SaveResumeResult;
  resetResume: () => void;
  emptyResume: () => void;
  /** Keyed by `getResumeSectionKey`, not by section id — several sections share id "custom". */
  setSectionVisibility: (sectionKey: string, visible: boolean) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  updateSectionColumn: (sectionKey: string, column: "left" | "right") => void;
  setTemplateId: (templateId: string) => void;
  updateCustomization: (values: Partial<ResumeCustomization>) => void;
  updateBasics: (values: Partial<ResumeBasics>) => void;
  updateTitle: (title: string) => void;
  updateSummary: (summary: string) => void;
  updateLinkDisplayMode: (displayMode: ResumeLinkDisplayMode) => void;
  updateLinkItem: (index: number, values: Partial<ResumeLinkItem>) => void;
  addLinkItem: () => void;
  removeLinkItem: (index: number) => void;
  updateSkills: (skills: ResumeSkillGroup[]) => void;
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
  /*
   * Custom sections are addressed by their own id, not by `kind`. Every custom section has
   * kind "custom", so a kind-keyed action could only ever reach the first one — which is
   * why a resume could hold just one.
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

export const useResumeStore = create<ResumeStoreState>((set, get) => ({
  resume: defaultResume,
  setResume: (resume) => set({ resume: withTimestamp(normalizeResumeData(resume)) }),

  // No `hydrateFromStorage`: it loaded the active-or-newest resume regardless of the id
  // the editor route asked for, which silently opened (and then autosaved over) a
  // different document. Editors hydrate by id via `loadResumeById` instead.
  saveToStorage: (options) => saveResumeToLocalStorage(get().resume, options),

  resetResume: () => {
    const activeResume = get().resume;

    const resetResumeValue = withTimestamp(
      normalizeResumeData({
        ...defaultResume,
        id: activeResume.id,
      }),
    );

    saveResumeToLocalStorage(resetResumeValue);
    set({ resume: resetResumeValue });
  },

  emptyResume: () => {
    const activeResume = get().resume;

    const emptyResumeValue = withTimestamp(
      normalizeResumeData({
        ...defaultResume,
        id: activeResume.id,
        basics: {
          fullName: "",
          role: "",
          headline: "",
          email: "",
          phone: "",
          location: "",
          linkEmail: true,
          linkPhone: true,
          linkLocation: false,
        },
        links: {
          displayMode: "icon-username",
          items: [],
        },
        summary: "",
        experience: [],
        education: [],
        projects: [],
        skills: [],
        languages: [],
        interests: [],
        awards: [],
        certificates: [],
        publications: [],
        volunteer: [],
        references: [],
        achievements: [],
        customSections: defaultResume.customSections.map((section) => ({
          ...section,
          items: [],
        })),
        sync: activeResume.sync,
      }),
    );

    saveResumeToLocalStorage(emptyResumeValue);
    set({ resume: emptyResumeValue });
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

  updateSkills: (skills) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        skills,
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
              label: section.title,
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
            items: [...section.items, createAdditionalItem("custom")],
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
