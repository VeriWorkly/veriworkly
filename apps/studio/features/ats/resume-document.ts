import {
  ATS_DOCUMENT_FORMAT,
  type AtsDocumentEntry,
  type AtsDocumentSection,
  type AtsResumeDocument,
} from "@veriworkly/ats-engine/document";

import type { ResumeData, ResumeLanguage, ResumeSection } from "@/types/resume";

/**
 * A saved Studio resume as the engine's structured input.
 *
 * Built from the typed fields, so the ATS record is read from the data rather than re-parsed
 * from text, and ordered and titled exactly as the template prints it: sections in the user's
 * order, hidden ones left out, headings as labelled. The engine renders it to the page text the
 * content rules score, so structure findings describe the resume the user will actually send.
 *
 * Volunteering, certifications and the other secondary sections go in as `other`: an ATS files
 * them separately from work history, and they must not count toward years of experience.
 */

const clean = (value: string | undefined) => value?.trim() ?? "";

/**
 * Each fluency as the engine reads a level: LinkedIn's wording where the bare word is ambiguous
 * ("limited" alone could be anything; "limited working proficiency" is B1).
 */
const FLUENCY_LEVEL: Record<ResumeLanguage["fluency"], string> = {
  elementary: "elementary proficiency",
  limited: "limited working proficiency",
  professional: "professional working proficiency",
  fluent: "fluent",
  native: "native",
};
const joined = (parts: Array<string | undefined>, separator = ", ") =>
  parts.map(clean).filter(Boolean).join(separator);

function entry(
  heading: Array<string | undefined>,
  lines: Array<string | undefined> = [],
): AtsDocumentEntry {
  return { heading: joined(heading) || undefined, lines: lines.map(clean).filter(Boolean) };
}

function span(start: string, end: string, current: boolean) {
  return joined([start, current ? "Present" : end], " - ");
}

function section(resume: ResumeData, placement: ResumeSection): AtsDocumentSection | null {
  const title = placement.label;

  switch (placement.id) {
    case "summary":
      return { kind: "summary", title, text: resume.summary };
    case "experience":
      return {
        kind: "experience",
        title,
        items: resume.experience.map((item) => ({
          title: item.role,
          employer: item.company,
          location: item.location,
          start: item.startDate,
          end: item.endDate,
          current: item.current,
          summary: item.summary,
          highlights: item.highlights,
        })),
      };
    case "education":
      return {
        kind: "education",
        title,
        items: resume.education.map((item) => ({
          school: item.school,
          credential: item.degree,
          field: item.field,
          start: item.startDate,
          end: item.endDate,
          current: item.current,
          summary: item.summary,
        })),
      };
    case "projects":
      return {
        kind: "projects",
        title,
        items: resume.projects.map((item) => ({
          name: item.name,
          role: item.role,
          url: item.link,
          summary: item.summary,
          highlights: item.highlights,
          skills: item.skills,
        })),
      };
    case "skills":
      return {
        kind: "skills",
        title,
        items: resume.skills.map((group) => ({ name: group.name, keywords: group.keywords })),
      };
    case "certifications":
      // As rows, so the engine files each as a certification (name, issuer, date) rather than
      // reading the section as free text.
      return {
        kind: "certifications",
        title,
        items: resume.certificates
          .filter((item) => clean(item.title))
          .map((item) => ({
            name: item.title,
            ...(clean(item.issuer) ? { issuer: item.issuer } : {}),
            ...(clean(item.date) ? { date: item.date } : {}),
            ...(clean(item.website) ? { url: item.website } : {}),
          })),
      };
    case "awards":
      return {
        kind: "other",
        title,
        items: resume.awards.map((item) =>
          entry([item.title, item.awarder, item.date], [item.description]),
        ),
      };
    case "publications":
      return {
        kind: "other",
        title,
        items: resume.publications.map((item) =>
          entry([item.title, item.publisher, item.date], [item.description]),
        ),
      };
    case "languages":
      // As rows, so a requirement such as "Fluent German" is judged against the level given.
      return {
        kind: "languages",
        title,
        items: resume.languages
          .filter((item) => clean(item.language))
          .map((item) => ({
            language: item.language,
            ...(item.fluency ? { level: FLUENCY_LEVEL[item.fluency] } : {}),
          })),
      };
    case "interests":
      return {
        kind: "other",
        title,
        items: resume.interests.map((item) => entry([item.name], [item.keywords.join(", ")])),
      };
    case "volunteer":
      return {
        kind: "other",
        title,
        items: resume.volunteer.map((item) =>
          entry(
            [
              item.role,
              item.organization,
              item.location,
              span(item.startDate, item.endDate, item.current),
            ],
            [item.summary],
          ),
        ),
      };
    case "references":
      return {
        kind: "other",
        title,
        items: resume.references.map((item) =>
          entry([item.name, item.title, item.organization], [item.relationship]),
        ),
      };
    case "achievements":
      return {
        kind: "other",
        title,
        items: resume.achievements.map((item) => entry([item.title], [item.description])),
      };
    case "custom": {
      const custom = resume.customSections.find(
        (candidate) => candidate.id === placement.customSectionId,
      );
      if (!custom) return null;
      return {
        kind: "other",
        title: custom.title || title,
        items: custom.items.map((item) =>
          entry(
            [item.name, item.issuer, item.date],
            [item.link, item.description, ...item.details],
          ),
        ),
      };
    }
    default:
      return null;
  }
}

/** Drops rows with nothing a template would print, the way the templates themselves do. */
function withoutEmptyRows(section: AtsDocumentSection): AtsDocumentSection {
  switch (section.kind) {
    case "summary":
      return section;
    case "experience":
      return {
        ...section,
        items: section.items.filter((i) => clean(i.title) || clean(i.employer)),
      };
    case "education":
      return {
        ...section,
        items: section.items.filter((i) => clean(i.school) || clean(i.credential)),
      };
    case "projects":
      return { ...section, items: section.items.filter((i) => clean(i.name)) };
    case "skills":
      return { ...section, items: section.items.filter((i) => clean(i.name) || i.keywords.length) };
    case "certifications":
    case "languages":
      return section;
    case "other":
      return { ...section, items: section.items.filter((i) => i.heading || i.lines?.length) };
  }
}

export function toAtsDocument(resume: ResumeData): AtsResumeDocument {
  const visible = [...resume.sections].filter((placement) => placement.visible);
  const sections = visible
    .sort((a, b) => a.order - b.order)
    .map((placement) => section(resume, placement))
    .filter((value): value is AtsDocumentSection => value !== null)
    .map(withoutEmptyRows);
  // Links print only when their section is shown; contact checks must not credit hidden ones.
  const showLinks = visible.some((placement) => placement.id === "links");

  const { basics } = resume;
  return {
    format: ATS_DOCUMENT_FORMAT,
    basics: {
      name: basics.fullName,
      headline: clean(basics.headline) || clean(basics.role) || undefined,
      email: basics.email || undefined,
      phone: basics.phone || undefined,
      location: basics.location || undefined,
      links: showLinks ? resume.links.items.map((link) => link.url).filter(Boolean) : [],
    },
    sections,
  };
}
