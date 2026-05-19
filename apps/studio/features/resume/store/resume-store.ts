"use client";

import type {
  ResumeData,
  ResumeBasics,
  ResumeLinkItem,
  ResumeSectionId,
  ResumeSkillGroup,
  ResumeProjectItem,
  ResumeCustomSection,
  ResumeCustomization,
  ResumeEducationItem,
  ResumeAdditionalItem,
  ResumeExperienceItem,
  ResumeLinkDisplayMode,
  ResumeAdditionalSectionKind,
} from "@/types/resume";

import { create } from "zustand";

import {
  createLinkItem,
  createSkillGroup,
  createProjectItem,
  createEducationItem,
  createExperienceItem,
  createAdditionalItem,
} from "@/features/resume/utils/factories";
import {
  type SaveResumeResult,
  type SaveResumeOptions,
  saveResumeToLocalStorage,
  loadResumeFromLocalStorage,
} from "@/features/resume/services/local-storage";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { reorderItems, withTimestamp } from "@/features/resume/store/resume-store-utils";

interface ResumeStoreState {
  resume: ResumeData;
  selectedSection: ResumeSectionId;
  setResume: (resume: ResumeData) => void;
  hydrateFromStorage: () => void;
  saveToStorage: (options?: SaveResumeOptions) => SaveResumeResult;
  resetResume: () => void;
  selectSection: (section: ResumeSectionId) => void;
  setSectionVisibility: (section: ResumeSectionId, visible: boolean) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  setTemplateId: (templateId: string) => void;
  updateCustomization: (values: Partial<ResumeCustomization>) => void;
  updateBasics: (values: Partial<ResumeBasics>) => void;
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
  updateCustomSection: (
    kind: ResumeAdditionalSectionKind,
    values: Partial<ResumeCustomSection>,
  ) => void;
  updateCustomSectionItem: (
    kind: ResumeAdditionalSectionKind,
    index: number,
    values: Partial<ResumeAdditionalItem>,
  ) => void;
  addCustomSectionItem: (kind: ResumeAdditionalSectionKind) => void;
  removeCustomSectionItem: (kind: ResumeAdditionalSectionKind, index: number) => void;
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
  selectedSection: "basics",
  setResume: (resume) => set({ resume: withTimestamp(normalizeResumeData(resume)) }),

  hydrateFromStorage: () => {
    const storedResume = loadResumeFromLocalStorage();

    if (!storedResume) {
      return;
    }

    set({ resume: normalizeResumeData(storedResume) });
  },

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
    set({ resume: resetResumeValue, selectedSection: "basics" });
  },

  selectSection: (selectedSection) => set({ selectedSection }),

  setSectionVisibility: (sectionId, visible) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        sections: state.resume.sections.map((section) =>
          section.id === sectionId ? { ...section, visible } : section,
        ),
      }),
    })),

  reorderSections: (fromIndex, toIndex) =>
    set((state) => {
      const reorderedSections = reorderItems(state.resume.sections, fromIndex, toIndex).map(
        (section, index) => ({
          ...section,
          order: index,
        }),
      );

      return {
        resume: withTimestamp({
          ...state.resume,
          sections: reorderedSections,
        }),
      };
    }),

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
      if (state.resume.skills.length <= 1) {
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

  updateCustomSection: (kind, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.map((item) =>
          item.kind === kind ? { ...item, ...values } : item,
        ),
      }),
    })),

  updateCustomSectionItem: (kind, index, values) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.map((section) => {
          if (section.kind !== kind) {
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

  addCustomSectionItem: (kind) =>
    set((state) => ({
      resume: withTimestamp({
        ...state.resume,
        customSections: state.resume.customSections.map((section) => {
          if (section.kind !== kind) {
            return section;
          }

          return {
            ...section,
            items: [...section.items, createAdditionalItem(kind)],
          };
        }),
      }),
    })),

  removeCustomSectionItem: (kind, index) =>
    set((state) => {
      return {
        resume: withTimestamp({
          ...state.resume,
          customSections: state.resume.customSections.map((section) => {
            if (section.kind !== kind || section.items.length === 0) {
              return section;
            }

            return {
              ...section,
              items: section.items.filter((_, itemIndex) => itemIndex !== index),
            };
          }),
        }),
      };
    }),

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
      if (state.resume.education.length <= 1) {
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
