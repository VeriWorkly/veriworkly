import type { ResumeData } from "@/types/resume";
import type { RenderContactItem } from "@/features/documents/rendering/resume-rendering";
import type {
  ResumeRenderItem,
  ResumeSectionBlock,
  ResumeSkillLine,
} from "@/templates/resume/shared/model";

import {
  getLinkDisplayText,
  getResumeRenderModel,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { buildResumeSections } from "@/templates/resume/shared/model";

export type ResumeExportContent =
  | { kind: "summary"; text: string }
  | { kind: "items"; items: ResumeRenderItem[] }
  | { kind: "skills"; lines: ResumeSkillLine[] };

export interface ResumeExportLink {
  text: string;
  href: string;
}

/**
 * What a resume prints, resolved once for every file format that is not drawn by a template.
 *
 * Built from the same render model and section list the preview and the PDF use, so the
 * DOCX, HTML, Markdown and text exports carry the same sections in the same order, the same
 * hidden basics and links, the same empty-section rule, headline, project stack, link labels
 * and emoji stripping — by construction rather than by keeping four copies in step.
 */
export interface ResumeExportDocument {
  name: string;
  headline: string;
  contact: RenderContactItem[];
  links: ResumeExportLink[];
  sections: ResumeSectionBlock<ResumeExportContent>[];
}

export function getResumeExportDocument(resume: ResumeData): ResumeExportDocument {
  const model = getResumeRenderModel(resume);

  return {
    name: model.showBasics ? model.name : "",
    headline: model.showBasics ? model.headline : "",
    contact: model.showBasics ? model.contactItems : [],
    links: model.showLinks
      ? model.renderedLinks.map((link) => ({
          text: getLinkDisplayText(link, resume.links.displayMode),
          href: normalizeLinkHref(link.url),
        }))
      : [],
    sections: buildResumeSections<ResumeExportContent>(resume, model, {
      summary: (text) => ({ kind: "summary", text }),
      items: (items) => ({ kind: "items", items }),
      skills: (lines) => ({ kind: "skills", lines }),
    }),
  };
}
