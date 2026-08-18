import type { ResumeData, ResumeCustomSection, ResumeLanguage } from "@/types/resume";

import { formatDateRange } from "@/features/resume/services/resume-formatters";
import {
  cleanResumeText,
  getEducationMeta,
  getEducationSchool,
  getEducationTitle,
  getProjectLinkText,
  getProjectTitle,
  hasAwardContent,
  hasCustomItemContent,
  hasCustomSectionContent,
  hasAchievementContent,
  hasCertificateContent,
  hasInterestContent,
  hasLanguageContent,
  hasPublicationContent,
  hasReferenceContent,
  hasResumeSectionContent,
  hasVolunteerContent,
  customSectionVisible,
  getOrderedResumeSections,
  getResumeSectionKey,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";

/**
 * Shared, renderer-agnostic shape for every item a resume section can print.
 *
 * Both the web preview and the PDF export build their items from these helpers, so a field
 * can never appear in one renderer and silently vanish from the other (the WYSIWYG class of
 * bug this file exists to prevent). The DOCX, HTML and Markdown exporters read the same
 * helpers for the optional sections, for the same reason.
 */
export interface ResumeRenderItem {
  id: string;
  /** Primary heading of the item (role, degree, project, certificate...). */
  title: string;
  /** Right-hand meta column, usually a date range. */
  meta: string;
  /** Secondary line under the title (company | location, school, tech stack). */
  subtitle: string;
  /** Optional trailing link rendered next to the title. */
  link: { href: string; text: string } | null;
  summary: string;
  bullets: string[];
}

export interface ResumeSkillLine {
  id: string;
  label: string;
  value: string;
}

function joinMeta(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => cleanResumeText(part))
    .filter(Boolean)
    .join(" | ");
}

function cleanList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => cleanResumeText(value)).filter(Boolean);
}

/** A website that the user has not switched off, as a render link. */
function optionalWebsiteLink(website: string | undefined, showLink: boolean) {
  if (!showLink) return null;

  const href = normalizeLinkHref(website ?? "");

  return href ? { href, text: cleanResumeText(website ?? "") } : null;
}

/**
 * Titles are left empty when the user has not filled them in, never substituted with
 * a placeholder word.
 *
 * Entries reaching here are pre-filtered by `hasExperienceContent` and friends, which
 * pass an entry that has *any* content — so a row with a company and bullets but no
 * role would previously render the literal text "Role" into the preview and, worse,
 * into the exported PDF/DOCX/HTML. Renderers skip an empty title (see `renderItem` in
 * shared/web.tsx and shared/pdf.tsx).
 */
export function getExperienceRenderItems(items: ResumeData["experience"]): ResumeRenderItem[] {
  return items.map((item) => ({
    id: item.id,
    title: cleanResumeText(item.role),
    meta: formatDateRange(item.startDate, item.endDate, item.current),
    subtitle: joinMeta([item.company, item.location]),
    link: null,
    summary: cleanResumeText(item.summary),
    bullets: cleanList(item.highlights),
  }));
}

export function getEducationRenderItems(items: ResumeData["education"]): ResumeRenderItem[] {
  return items.map((item) => ({
    id: item.id,
    title: getEducationTitle(item),
    meta: getEducationMeta(item),
    subtitle: getEducationSchool(item),
    link: null,
    summary: cleanResumeText(item.summary),
    bullets: [],
  }));
}

export function getProjectRenderItems(items: ResumeData["projects"]): ResumeRenderItem[] {
  return items.map((item) => {
    const href = normalizeLinkHref(item.link);

    return {
      id: item.id,
      title: getProjectTitle(item),
      meta: "",
      subtitle: cleanList(item.skills).join(", "),
      link: href ? { href, text: getProjectLinkText(item) || href } : null,
      summary: cleanResumeText(item.summary),
      bullets: cleanList(item.highlights),
    };
  });
}

export function getCustomRenderItems(section: ResumeCustomSection): ResumeRenderItem[] {
  return section.items.filter(hasCustomItemContent).map((item) => {
    const href = normalizeLinkHref(item.link);

    return {
      id: item.id,
      title: cleanResumeText(item.name) || "Item",
      meta: cleanResumeText(item.date),
      subtitle: joinMeta([item.issuer, item.referenceId]),
      link: href ? { href, text: cleanResumeText(item.link) } : null,
      summary: cleanResumeText(item.description),
      bullets: cleanList(item.details),
    };
  });
}

export function getSkillLines(groups: ResumeData["skills"]): ResumeSkillLine[] {
  return groups.map((group, index) => ({
    id: group.id || `${group.name}-${index}`,
    label: cleanResumeText(group.name),
    value: cleanList(group.keywords).join(", "),
  }));
}

/*
 * The eight typed sections, each with its own mapping.
 *
 * These used to share one mapping, because they shared one storage shape: every optional
 * section was squeezed into `{name, issuer, date, link, referenceId, description, details}`
 * and rendered as `title = name`, `subtitle = issuer | referenceId`. That is why a
 * reference's phone number printed in the date column. Each section now says what its
 * fields mean.
 */

const FLUENCY_LABELS: Record<ResumeLanguage["fluency"], string> = {
  elementary: "Elementary",
  limited: "Limited working",
  professional: "Professional working",
  fluent: "Fluent",
  native: "Native",
};

export function getCertificateRenderItems(items: ResumeData["certificates"]): ResumeRenderItem[] {
  return items.filter(hasCertificateContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.title),
    meta: cleanResumeText(item.date),
    // The credential id sits beside the issuer, which is where the flattened model printed
    // it and where a reader expects it.
    subtitle: joinMeta([item.issuer, item.referenceId]),
    link: optionalWebsiteLink(item.website, item.showLink),
    summary: cleanResumeText(item.description),
    bullets: [],
  }));
}

export function getAwardRenderItems(items: ResumeData["awards"]): ResumeRenderItem[] {
  return items.filter(hasAwardContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.title),
    meta: cleanResumeText(item.date),
    subtitle: cleanResumeText(item.awarder),
    link: optionalWebsiteLink(item.website, item.showLink),
    summary: cleanResumeText(item.description),
    bullets: [],
  }));
}

export function getPublicationRenderItems(items: ResumeData["publications"]): ResumeRenderItem[] {
  return items.filter(hasPublicationContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.title),
    meta: cleanResumeText(item.date),
    subtitle: cleanResumeText(item.publisher),
    link: optionalWebsiteLink(item.website, item.showLink),
    summary: cleanResumeText(item.description),
    bullets: [],
  }));
}

export function getLanguageRenderItems(items: ResumeData["languages"]): ResumeRenderItem[] {
  return items.filter(hasLanguageContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.language),
    meta: "",
    subtitle: FLUENCY_LABELS[item.fluency] ?? "",
    link: null,
    summary: "",
    bullets: [],
  }));
}

export function getInterestRenderItems(items: ResumeData["interests"]): ResumeRenderItem[] {
  return items.filter(hasInterestContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.name),
    meta: "",
    subtitle: "",
    link: null,
    summary: "",
    bullets: cleanList(item.keywords),
  }));
}

export function getVolunteerRenderItems(items: ResumeData["volunteer"]): ResumeRenderItem[] {
  return items.filter(hasVolunteerContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.organization),
    // A real date range, formatted the same way experience is. The flattened model stored
    // the two dates pre-joined into a display string, so this column used to print whatever
    // the concatenation happened to produce.
    meta: formatDateRange(item.startDate, item.endDate, item.current),
    subtitle: joinMeta([item.role, item.location]),
    link: null,
    summary: cleanResumeText(item.summary),
    bullets: [],
  }));
}

export function getReferenceRenderItems(items: ResumeData["references"]): ResumeRenderItem[] {
  return items.filter(hasReferenceContent).map((item) => {
    const email = cleanResumeText(item.email ?? "");
    const phone = cleanResumeText(item.phone ?? "");

    return {
      id: item.id,
      title: cleanResumeText(item.name),
      // The phone number, in the field a phone number belongs in. It used to be written to
      // — and printed from — a property called `date`.
      meta: phone,
      subtitle: joinMeta([item.title, item.organization]),
      link: email ? { href: `mailto:${email}`, text: email } : null,
      summary: cleanResumeText(item.relationship),
      bullets: [],
    };
  });
}

export function getAchievementRenderItems(items: ResumeData["achievements"]): ResumeRenderItem[] {
  return items.filter(hasAchievementContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.title),
    meta: "",
    subtitle: "",
    link: null,
    summary: cleanResumeText(item.description),
    bullets: [],
  }));
}

/** One optional section, resolved to printable items. */
export interface ResumeAdditionalBlock {
  /** Unique across the document — see `getResumeSectionKey`. */
  key: string;
  title: string;
  items: ResumeRenderItem[];
}

/** Human-readable heading for each of the eight fixed optional sections. */
export const ADDITIONAL_SECTION_TITLES = {
  certifications: "Certifications",
  awards: "Awards",
  publications: "Publications",
  languages: "Languages",
  interests: "Interests",
  volunteer: "Volunteer",
  references: "References",
  achievements: "Achievements",
} as const;

/**
 * Every optional section a resume prints — the eight typed ones plus any number of custom
 * ones — in the user's order, with the empty and hidden ones dropped.
 *
 * Shared by the DOCX, HTML and Markdown exporters so they cannot disagree with the preview
 * about what an optional section contains. Before the typed model they iterated
 * `resume.customSections` directly and gated the lot behind the single "custom" toggle.
 */
export function getResumeAdditionalBlocks(resume: ResumeData): ResumeAdditionalBlock[] {
  const blocks: ResumeAdditionalBlock[] = [];

  for (const section of getOrderedResumeSections(resume)) {
    if (section.id === "custom") {
      /*
       * The `kind` fallback is for a document read without normalisation, whose section
       * entries predate `customSectionId`. It can go once no stored resume reaches an
       * exporter without one — `normalizeResumeData` assigns them on read.
       */
      const custom = section.customSectionId
        ? resume.customSections.find((entry) => entry.id === section.customSectionId)
        : resume.customSections.find((entry) => entry.kind === "custom");

      if (!custom || !hasCustomSectionContent(custom)) continue;
      if (!customSectionVisible(resume, custom.id)) continue;

      blocks.push({
        key: getResumeSectionKey(section),
        title: cleanResumeText(custom.title),
        items: getCustomRenderItems(custom),
      });

      continue;
    }

    if (!(section.id in ADDITIONAL_SECTION_TITLES)) continue;
    if (!hasResumeSectionContent(resume, section.id)) continue;

    const title = ADDITIONAL_SECTION_TITLES[section.id as keyof typeof ADDITIONAL_SECTION_TITLES];

    blocks.push({
      key: getResumeSectionKey(section),
      title,
      items: getAdditionalSectionItems(resume, section.id),
    });
  }

  return blocks;
}

/** The typed items for one of the eight fixed optional sections. */
export function getAdditionalSectionItems(
  resume: ResumeData,
  sectionId: keyof typeof ADDITIONAL_SECTION_TITLES | string,
): ResumeRenderItem[] {
  switch (sectionId) {
    case "certifications":
      return getCertificateRenderItems(resume.certificates);
    case "awards":
      return getAwardRenderItems(resume.awards);
    case "publications":
      return getPublicationRenderItems(resume.publications);
    case "languages":
      return getLanguageRenderItems(resume.languages);
    case "interests":
      return getInterestRenderItems(resume.interests);
    case "volunteer":
      return getVolunteerRenderItems(resume.volunteer);
    case "references":
      return getReferenceRenderItems(resume.references);
    case "achievements":
      return getAchievementRenderItems(resume.achievements);
    default:
      return [];
  }
}
