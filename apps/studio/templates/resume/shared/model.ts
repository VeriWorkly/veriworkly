import type { ResumeData } from "@/types/resume";

import {
  cleanResumeText,
  hasResumeSectionContent,
  getOrderedResumeSections,
  getResumeSectionKey,
} from "@/features/documents/rendering/resume-rendering";
import {
  getSkillLines,
  getCustomRenderItems,
  getProjectRenderItems,
  getEducationRenderItems,
  getExperienceRenderItems,
  getAdditionalSectionItems,
  ADDITIONAL_SECTION_TITLES,
  type ResumeRenderItem,
  type ResumeSkillLine,
} from "@/features/documents/rendering/resume-render-items";

/*
 * Re-exports, not declarations. The item builders moved to
 * `features/documents/rendering/resume-render-items.ts` so the DOCX, HTML and Markdown
 * exporters can read the same mappings the two renderers do — those exporters cannot import
 * from `templates/`. Templates keep importing them from here.
 */
export {
  getSkillLines,
  getCustomRenderItems,
  getProjectRenderItems,
  getEducationRenderItems,
  getExperienceRenderItems,
  getCertificateRenderItems,
  getAwardRenderItems,
  getPublicationRenderItems,
  getLanguageRenderItems,
  getInterestRenderItems,
  getVolunteerRenderItems,
  getReferenceRenderItems,
  getAchievementRenderItems,
} from "@/features/documents/rendering/resume-render-items";
export type {
  ResumeRenderItem,
  ResumeSkillLine,
} from "@/features/documents/rendering/resume-render-items";
export { getOrderedResumeSections } from "@/features/documents/rendering/resume-rendering";

export interface ResumeSectionBlock<T> {
  /** Unique across the document: several sections share the id "custom". */
  id: string;
  title: string;
  children: T;
}

/**
 * How each renderer turns one section's content into its own node type.
 */
export interface ResumeSectionRenderers<T> {
  items: (items: ResumeRenderItem[]) => T;
  skills: (lines: ResumeSkillLine[]) => T;
  summary: (text: string) => T;
}

/**
 * The sections a resume actually prints, in order, with the empty ones dropped.
 *
 * Shared so the two renderers cannot disagree about which sections exist or
 * what order they come in — and so each of them can tell which section is
 * *first*, which decides where the spacing between sections goes. Spacing sits
 * above a section rather than below it, because a trailing margin on the last
 * one is invisible on screen yet still counts against the page in react-pdf.
 */
export function buildResumeSections<T>(
  resume: ResumeData,
  model: {
    visibleExperience: ResumeData["experience"];
    visibleEducation: ResumeData["education"];
    visibleProjects: ResumeData["projects"];
    visibleSkills: ResumeData["skills"];
  },
  render: ResumeSectionRenderers<T>,
): ResumeSectionBlock<T>[] {
  const blocks: ResumeSectionBlock<T>[] = [];

  for (const section of getOrderedResumeSections(resume)) {
    const id = getResumeSectionKey(section);

    switch (section.id) {
      case "summary":
        if (!hasResumeSectionContent(resume, "summary")) break;
        blocks.push({
          id,
          title: "Summary",
          children: render.summary(cleanResumeText(resume.summary)),
        });
        break;

      case "experience":
        if (!hasResumeSectionContent(resume, "experience")) break;
        blocks.push({
          id,
          title: "Experience",
          children: render.items(getExperienceRenderItems(model.visibleExperience)),
        });
        break;

      case "education":
        if (!hasResumeSectionContent(resume, "education")) break;
        blocks.push({
          id,
          title: "Education",
          children: render.items(getEducationRenderItems(model.visibleEducation)),
        });
        break;

      case "projects":
        if (!hasResumeSectionContent(resume, "projects")) break;
        blocks.push({
          id,
          title: "Projects",
          children: render.items(getProjectRenderItems(model.visibleProjects)),
        });
        break;

      case "skills":
        if (!hasResumeSectionContent(resume, "skills")) break;
        blocks.push({
          id,
          title: "Skills",
          children: render.skills(getSkillLines(model.visibleSkills)),
        });
        break;

      case "custom": {
        /*
         * Addressed by `customSectionId`, so every custom section a user creates prints.
         * The `kind === section.id` lookup this replaced could only ever match the first
         * one, because "custom" is a single member of the section-id enum.
         *
         * The `kind` fallback is for documents mid-migration, whose section entries predate
         * `customSectionId`. It can be removed once no stored resume reaches this without
         * one — `normalizeResumeData` assigns them on read, so that is one save away for
         * any document a user opens.
         */
        const custom = section.customSectionId
          ? resume.customSections.find((entry) => entry.id === section.customSectionId)
          : resume.customSections.find((entry) => entry.kind === "custom");

        if (!custom) break;

        const items = getCustomRenderItems(custom);

        if (!items.length) break;

        blocks.push({
          id,
          title: cleanResumeText(custom.title),
          children: render.items(items),
        });
        break;
      }

      default: {
        const title =
          ADDITIONAL_SECTION_TITLES[section.id as keyof typeof ADDITIONAL_SECTION_TITLES];

        if (!title || !hasResumeSectionContent(resume, section.id)) break;

        const items = getAdditionalSectionItems(resume, section.id);

        if (!items.length) break;

        blocks.push({ id, title, children: render.items(items) });
      }
    }
  }

  return blocks;
}
