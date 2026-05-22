import type {
  ResumeData,
  ResumeBasics,
  ResumeLinkItem,
  ResumeLinkType,
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

export function getLinkIconLabel(type: ResumeLinkType): string {
  const labels: Record<ResumeLinkType, string> = {
    github: "GH",
    linkedin: "in",
    dribbble: "Dr",
    twitter: "X",
    portfolio: "Web",
    behance: "Be",
    medium: "M",
    youtube: "YT",
    custom: "Link",
  };

  return labels[type] ?? "Link";
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
    case "custom":
      return resume.customSections
        .filter((section) => section.kind === "custom")
        .some((section) => hasCustomSectionContent(section));
    default:
      return resume.customSections
        .filter((section) => section.kind === sectionId)
        .some((section) => hasCustomSectionContent(section));
  }
}
