import type {
  ResumeData,
  ResumeBasics,
  ResumeSection,
  ResumeLinkItem,
  ResumeSectionId,
  ResumeCustomization,
} from "@/types/resume";

import { formatDateRange, safeText } from "@/features/resume/services/resume-formatters";
import { stripEmoji } from "@/features/documents/utils/strip-emoji";
import { isSectionVisible } from "@/features/documents/utils/section-helpers";
import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";
import { RESUME_LAYOUT } from "@/features/resume/constants/resume-layout";

export type ResumeRenderStyle = Required<
  Pick<
    ResumeCustomization,
    | "accentColor"
    | "textColor"
    | "mutedTextColor"
    | "borderColor"
    | "pageBackgroundColor"
    | "sectionBackgroundColor"
    | "sectionHeadingColor"
    | "sectionSpacing"
    | "pagePadding"
    | "bodyLineHeight"
    | "headingLineHeight"
  >
> & {
  fontFamily: ReturnType<typeof normalizeFontFamilyId>;
};

export interface RenderContactItem {
  key: "email" | "phone" | "location";
  label: string;
  href?: string;
}

export interface ResumeRenderModel {
  style: ResumeRenderStyle;
  contactItems: RenderContactItem[];
  renderedLinks: ResumeLinkItem[];
  showBasics: boolean;
  showLinks: boolean;
  showSummary: boolean;
  showExperience: boolean;
  showEducation: boolean;
  showProjects: boolean;
  showSkills: boolean;
  visibleExperience: ResumeData["experience"];
  visibleEducation: ResumeData["education"];
  visibleProjects: ResumeData["projects"];
  visibleSkills: ResumeData["skills"];
  visibleCustomSections: ResumeData["customSections"];
}

/**
 * A stable, unique handle for one section entry.
 *
 * `section.id` is not unique any more: every custom section carries the id "custom", so it
 * cannot be a React key, a lookup key, or the identifier a visibility toggle addresses.
 */
export function getResumeSectionKey(
  section: Pick<ResumeSection, "id" | "customSectionId">,
): string {
  return section.customSectionId ? `custom:${section.customSectionId}` : section.id;
}

/** Sections that participate in the flowing body, in user-defined order. */
export function getOrderedResumeSections(resume: ResumeData): ResumeSection[] {
  return [...resume.sections]
    .filter((section) => section.id !== "basics" && section.id !== "links")
    .filter((section) => section.visible !== false)
    .sort((a, b) => a.order - b.order);
}

export function cleanResumeText(value: string | null | undefined): string {
  return stripEmoji(safeText(value ?? "")).replace(/\s+/g, " ");
}

export function getResumeRenderStyle(resume: ResumeData): ResumeRenderStyle {
  const customization = resume.customization;

  return {
    accentColor: customization?.accentColor || "#2563eb",
    textColor: customization?.textColor || "#0f172a",
    mutedTextColor: customization?.mutedTextColor || "#475569",
    borderColor: customization?.borderColor || "#cbd5e1",
    pageBackgroundColor: customization?.pageBackgroundColor || "#ffffff",
    sectionBackgroundColor: customization?.sectionBackgroundColor || "#ffffff",
    sectionHeadingColor:
      customization?.sectionHeadingColor || customization?.accentColor || "#2563eb",
    fontFamily: normalizeFontFamilyId(customization?.fontFamily),
    sectionSpacing: customization?.sectionSpacing || RESUME_LAYOUT.sectionSpacing,
    pagePadding: customization?.pagePadding || RESUME_LAYOUT.pagePadding,
    bodyLineHeight: customization?.bodyLineHeight || RESUME_LAYOUT.bodyLineHeight,
    headingLineHeight: customization?.headingLineHeight || RESUME_LAYOUT.headingLineHeight,
  };
}

export function sectionVisible(resume: ResumeData, sectionId: ResumeSectionId): boolean {
  return isSectionVisible(resume.sections, sectionId);
}

/**
 * Visibility of one custom section.
 *
 * `sectionVisible(resume, "custom")` cannot answer this: `isSectionVisible` matches on id,
 * and every custom entry shares the id "custom", so it would report the first one's state
 * for all of them.
 */
export function customSectionVisible(resume: ResumeData, customSectionId: string): boolean {
  const entry = resume.sections.find(
    (section) => section.id === "custom" && section.customSectionId === customSectionId,
  );

  return entry ? entry.visible !== false : true;
}

export function getContactItems(basics: ResumeBasics): RenderContactItem[] {
  const email = cleanResumeText(basics.email);
  const phone = cleanResumeText(basics.phone);
  const location = cleanResumeText(basics.location);

  const items: Array<RenderContactItem | null> = [
    email
      ? {
          key: "email" as const,
          label: email,
          href: basics.linkEmail ? `mailto:${email}` : undefined,
        }
      : null,
    phone
      ? {
          key: "phone" as const,
          label: phone,
          href: basics.linkPhone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined,
        }
      : null,
    location
      ? {
          key: "location" as const,
          label: location,
          href: basics.linkLocation
            ? `https://www.google.com/search?q=${encodeURIComponent(location)}`
            : undefined,
        }
      : null,
  ];

  return items.filter((item): item is RenderContactItem => item !== null);
}

export function normalizeLinkHref(url: string): string {
  const trimmed = cleanResumeText(url);

  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function getUrlDisplayText(url: string): string {
  const cleanUrl = cleanResumeText(url);

  if (!cleanUrl) return "";

  try {
    const parsed = new URL(normalizeLinkHref(cleanUrl));
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`.replace(
      /\/$/,
      "",
    );
  } catch {
    return cleanUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

export function getLinkDisplayText(
  link: ResumeLinkItem,
  displayMode: ResumeData["links"]["displayMode"],
): string {
  const label = cleanResumeText(link.label);
  const typeLabel = cleanResumeText(link.type);
  const urlText = getUrlDisplayText(link.url);

  if (displayMode === "icon") {
    return label || typeLabel || urlText;
  }

  if (displayMode === "url") {
    return urlText || label || typeLabel;
  }

  return label || urlText || typeLabel;
}

export function getEducationTitle(item: ResumeData["education"][number]): string {
  return [cleanResumeText(item.degree), cleanResumeText(item.field)].filter(Boolean).join(", ");
}

export function getEducationSchool(item: ResumeData["education"][number]): string {
  return cleanResumeText(item.school);
}

export function getEducationMeta(item: ResumeData["education"][number]): string {
  return formatDateRange(item.startDate, item.endDate, item.current);
}

export function getProjectTitle(item: ResumeData["projects"][number]): string {
  return [cleanResumeText(item.name), cleanResumeText(item.role)].filter(Boolean).join(" | ");
}

export function getProjectLinkText(item: ResumeData["projects"][number]): string {
  if (item.showLinkAsText ?? true) {
    return cleanResumeText(item.linkLabel) || "Link";
  }

  return cleanResumeText(item.link);
}

export function hasExperienceContent(item: ResumeData["experience"][number]): boolean {
  return Boolean(
    cleanResumeText(item.role) ||
    cleanResumeText(item.company) ||
    cleanResumeText(item.location) ||
    cleanResumeText(item.summary) ||
    item.highlights.some((highlight) => cleanResumeText(highlight)),
  );
}

export function hasEducationContent(item: ResumeData["education"][number]): boolean {
  return Boolean(
    cleanResumeText(item.school) ||
    cleanResumeText(item.degree) ||
    cleanResumeText(item.field) ||
    cleanResumeText(item.summary),
  );
}

export function hasProjectContent(item: ResumeData["projects"][number]): boolean {
  return Boolean(
    cleanResumeText(item.name) ||
    cleanResumeText(item.role) ||
    cleanResumeText(item.link) ||
    item.skills?.some((skill) => cleanResumeText(skill)) ||
    cleanResumeText(item.summary) ||
    item.highlights.some((highlight) => cleanResumeText(highlight)),
  );
}

export function hasSkillGroupContent(item: ResumeData["skills"][number]): boolean {
  return Boolean(
    cleanResumeText(item.name) && item.keywords.some((keyword) => cleanResumeText(keyword)),
  );
}

export function hasCustomItemContent(item: ResumeData["customSections"][number]["items"][number]) {
  return Boolean(
    cleanResumeText(item.name) ||
    cleanResumeText(item.issuer) ||
    cleanResumeText(item.date) ||
    cleanResumeText(item.link) ||
    cleanResumeText(item.description) ||
    item.details.some((detail) => cleanResumeText(detail)),
  );
}

export function hasCustomSectionContent(section: ResumeData["customSections"][number]): boolean {
  return section.items.some((item) => hasCustomItemContent(item));
}

/*
 * Content predicates for the eight typed sections.
 *
 * Each one asks the same question the flattened `hasCustomItemContent` used to ask — "did
 * the user put anything in this row?" — against the fields the row actually has, so an
 * entry with only a phone number or only a fluency still counts as content.
 */

export function hasLanguageContent(item: ResumeData["languages"][number]): boolean {
  return Boolean(cleanResumeText(item.language));
}

export function hasInterestContent(item: ResumeData["interests"][number]): boolean {
  return Boolean(
    cleanResumeText(item.name) || item.keywords.some((keyword) => cleanResumeText(keyword)),
  );
}

export function hasAwardContent(item: ResumeData["awards"][number]): boolean {
  return Boolean(
    cleanResumeText(item.title) ||
    cleanResumeText(item.awarder) ||
    cleanResumeText(item.date) ||
    cleanResumeText(item.website ?? "") ||
    cleanResumeText(item.description),
  );
}

export function hasCertificateContent(item: ResumeData["certificates"][number]): boolean {
  return Boolean(
    cleanResumeText(item.title) ||
    cleanResumeText(item.issuer) ||
    cleanResumeText(item.date) ||
    cleanResumeText(item.website ?? "") ||
    cleanResumeText(item.referenceId ?? "") ||
    cleanResumeText(item.description),
  );
}

export function hasPublicationContent(item: ResumeData["publications"][number]): boolean {
  return Boolean(
    cleanResumeText(item.title) ||
    cleanResumeText(item.publisher) ||
    cleanResumeText(item.date) ||
    cleanResumeText(item.website ?? "") ||
    cleanResumeText(item.description),
  );
}

export function hasVolunteerContent(item: ResumeData["volunteer"][number]): boolean {
  return Boolean(
    cleanResumeText(item.organization) ||
    cleanResumeText(item.role) ||
    cleanResumeText(item.location) ||
    cleanResumeText(item.summary) ||
    cleanResumeText(item.startDate),
  );
}

export function hasReferenceContent(item: ResumeData["references"][number]): boolean {
  return Boolean(
    cleanResumeText(item.name) ||
    cleanResumeText(item.title) ||
    cleanResumeText(item.organization) ||
    cleanResumeText(item.relationship) ||
    cleanResumeText(item.email ?? "") ||
    cleanResumeText(item.phone ?? ""),
  );
}

export function hasAchievementContent(item: ResumeData["achievements"][number]): boolean {
  return Boolean(cleanResumeText(item.title) || cleanResumeText(item.description));
}

export function hasResumeSectionContent(resume: ResumeData, sectionId: ResumeSectionId): boolean {
  if (!sectionVisible(resume, sectionId)) return false;

  switch (sectionId) {
    case "basics":
      return Boolean(
        cleanResumeText(resume.basics.fullName) ||
        cleanResumeText(resume.basics.headline) ||
        cleanResumeText(resume.basics.role) ||
        getContactItems(resume.basics).length,
      );
    case "links":
      return resume.links.items.some((link) => normalizeLinkHref(link.url));
    case "summary":
      return Boolean(cleanResumeText(resume.summary));
    case "experience":
      return resume.experience.some((item) => hasExperienceContent(item));
    case "education":
      return resume.education.some((item) => hasEducationContent(item));
    case "projects":
      return resume.projects.some((item) => hasProjectContent(item));
    case "skills":
      return resume.skills.some((item) => hasSkillGroupContent(item));
    case "certifications":
      return resume.certificates.some((item) => hasCertificateContent(item));
    case "awards":
      return resume.awards.some((item) => hasAwardContent(item));
    case "publications":
      return resume.publications.some((item) => hasPublicationContent(item));
    case "languages":
      return resume.languages.some((item) => hasLanguageContent(item));
    case "interests":
      return resume.interests.some((item) => hasInterestContent(item));
    case "volunteer":
      return resume.volunteer.some((item) => hasVolunteerContent(item));
    case "references":
      return resume.references.some((item) => hasReferenceContent(item));
    case "achievements":
      return resume.achievements.some((item) => hasAchievementContent(item));
    /*
     * "custom" answers for the whole group, which is all a caller with only a section id
     * can ask. A caller that needs one specific custom section addresses it by
     * `customSectionId` and uses `hasCustomSectionContent` directly.
     */
    case "custom":
      return resume.customSections.some((section) => hasCustomSectionContent(section));
    default:
      return false;
  }
}

export function getResumeRenderModel(resume: ResumeData): ResumeRenderModel {
  const style = getResumeRenderStyle(resume);

  return {
    style,
    contactItems: getContactItems(resume.basics),
    renderedLinks: resume.links.items.filter((link) => normalizeLinkHref(link.url)),
    showBasics: hasResumeSectionContent(resume, "basics"),
    showLinks: hasResumeSectionContent(resume, "links"),
    showSummary: hasResumeSectionContent(resume, "summary"),
    showExperience: hasResumeSectionContent(resume, "experience"),
    showEducation: hasResumeSectionContent(resume, "education"),
    showProjects: hasResumeSectionContent(resume, "projects"),
    showSkills: hasResumeSectionContent(resume, "skills"),
    visibleExperience: resume.experience.filter(hasExperienceContent),
    visibleEducation: resume.education.filter(hasEducationContent),
    visibleProjects: resume.projects.filter(hasProjectContent),
    visibleSkills: resume.skills.filter(hasSkillGroupContent),
    visibleCustomSections: resume.customSections.filter(
      (section) => customSectionVisible(resume, section.id) && hasCustomSectionContent(section),
    ),
  };
}
