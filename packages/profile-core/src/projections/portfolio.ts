import type { MasterProfileData } from "../schema/types.js";
import type {
  PortfolioContent,
  PortfolioLink,
  PortfolioSection,
  PortfolioSectionType,
} from "./portfolio-types.js";

/** Default subtitles per section type to keep projected sections informative. */
const SECTION_SUBTITLE_DEFAULTS: Record<PortfolioSectionType, string> = {
  projects: "Selected work and the outcomes behind it.",
  experience: "Where I've worked and what I was responsible for.",
  education: "Formal study and training.",
  services: "Ways we can work together.",
  skills: "Tools and capabilities I work with.",
  writing: "Essays, notes, and talks.",
  testimonials: "What people I've worked with say.",
  awards: "Recognition and honours.",
  certifications: "Credentials and licences.",
  languages: "Languages I speak and write.",
  interests: "What I spend time on outside work.",
  publications: "Papers, articles, and books.",
  patents: "Filed and granted inventions.",
  testScores: "Standardized results.",
  achievements: "Milestones worth noting.",
  volunteer: "Community and non-profit work.",
  custom: "",
  contact: "",
};

const SECTION_TITLE_DEFAULTS: Record<PortfolioSectionType, string> = {
  projects: "Projects",
  experience: "Experience",
  services: "Services",
  skills: "Skills",
  education: "Education",
  writing: "Writing",
  testimonials: "Testimonials",
  awards: "Awards",
  certifications: "Certifications",
  languages: "Languages",
  interests: "Interests",
  publications: "Publications",
  patents: "Patents",
  testScores: "Test Scores",
  achievements: "Achievements",
  volunteer: "Volunteer Experience",
  custom: "Custom Section",
  contact: "Contact",
};

/** Formats social link type to standard display label when label is blank. */
function humanizeLinkType(type: string): string {
  const map: Record<string, string> = {
    github: "GitHub",
    linkedin: "LinkedIn",
    twitter: "Twitter / X",
    portfolio: "Portfolio",
    custom: "Website",
  };
  return map[type.toLowerCase()] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

/** Truncates SEO description to ~155 characters on a word boundary. */
function truncateSeoDescription(text: string, maxLen = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 30 ? cut.slice(0, lastSpace).trim() : cut.trim();
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Pure projection: MasterProfileData -> PortfolioContent.
 *
 * Requirements:
 * - Pure: Shares zero object references with the input master profile.
 * - Non-empty sections only: Omit section types whose source arrays in master are empty.
 * - Redundancy for template safety: Writes both `summary` and `description`, and both
 *   `name` and `title`, matching the itemProse / itemLabel contract in apps/portfolio.
 */
export function projectToPortfolio<TTemplateId extends string = string>(
  master: MasterProfileData,
  options: { templateId: TTemplateId; availability?: string },
): PortfolioContent<TTemplateId> {
  const basics = master.basics;
  const fullName = basics.fullName?.trim() || "";
  const summary = master.summary?.trim() || "";
  const headline = basics.headline?.trim() || basics.role?.trim() || "";

  // 1. Identity
  const identity = {
    name: fullName,
    headline,
    bio: summary,
    location: basics.location?.trim() || "",
    email: basics.email?.trim() || "",
    availability: options.availability ?? "",
    avatar: null,
  };

  // 2. SEO
  const seo = {
    title: fullName ? `${fullName} | Portfolio` : "Portfolio",
    description: truncateSeoDescription(summary),
    socialImage: null,
  };

  // 3. Social Links
  const socialLinks: PortfolioLink[] = (master.links?.items || [])
    .filter((item) => item.url && item.url.trim() !== "")
    .map((item) => ({
      id: item.id || `link-${Math.random().toString(36).slice(2, 9)}`,
      label: item.label?.trim() || humanizeLinkType(item.type),
      url: item.url.trim(),
    }));

  // 4. Sections
  const sections: PortfolioSection[] = [];

  function addSectionIfNotEmpty(type: PortfolioSectionType, items: Array<Record<string, unknown>>) {
    if (items.length === 0) return;
    sections.push({
      id: `section-${type}`,
      type,
      title: SECTION_TITLE_DEFAULTS[type],
      subtitle: SECTION_SUBTITLE_DEFAULTS[type],
      visible: true,
      items: deepClone(items),
    });
  }

  // Projects
  addSectionIfNotEmpty(
    "projects",
    (master.projects || []).map((p) => ({
      id: p.id,
      name: p.name,
      title: p.name,
      role: p.role,
      link: p.link,
      linkLabel: p.linkLabel || "Link",
      showLinkAsText: p.showLinkAsText ?? true,
      summary: p.summary,
      description: p.summary,
      highlights: p.highlights || [],
      skills: p.skills || [],
      coverImage: null,
    })),
  );

  // Experience
  addSectionIfNotEmpty(
    "experience",
    (master.experience || []).map((e) => ({
      id: e.id,
      company: e.company,
      role: e.role,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      summary: e.summary,
      description: e.summary,
      highlights: e.highlights || [],
      coverImage: null,
    })),
  );

  // Education
  addSectionIfNotEmpty(
    "education",
    (master.education || []).map((ed) => ({
      id: ed.id,
      school: ed.school,
      degree: ed.degree,
      field: ed.field,
      startDate: ed.startDate,
      endDate: ed.endDate,
      current: ed.current,
      summary: ed.summary,
      description: ed.summary,
      coverImage: null,
    })),
  );

  // Skills
  addSectionIfNotEmpty(
    "skills",
    (master.skills || []).map((s) => ({
      id: s.id,
      name: s.name,
      title: s.name,
      keywords: s.keywords || [],
      summary: "",
      description: "",
    })),
  );

  // Certifications (from master.certificates)
  addSectionIfNotEmpty(
    "certifications",
    (master.certificates || []).map((c) => ({
      id: c.id,
      name: c.title,
      title: c.title,
      issuer: c.issuer,
      date: c.date,
      link: c.website,
      description: c.description,
      summary: c.description,
    })),
  );

  // Awards
  addSectionIfNotEmpty(
    "awards",
    (master.awards || []).map((a) => ({
      id: a.id,
      name: a.title,
      title: a.title,
      issuer: a.awarder,
      date: a.date,
      link: a.website,
      description: a.description,
      summary: a.description,
    })),
  );

  // Publications
  addSectionIfNotEmpty(
    "publications",
    (master.publications || []).map((pub) => ({
      id: pub.id,
      name: pub.title,
      title: pub.title,
      issuer: pub.publisher,
      date: pub.date,
      link: pub.website,
      description: pub.description,
      summary: pub.description,
    })),
  );

  // Volunteer
  addSectionIfNotEmpty(
    "volunteer",
    (master.volunteer || []).map((v) => ({
      id: v.id,
      name: v.organization,
      title: v.organization,
      issuer: v.role,
      startDate: v.startDate,
      endDate: v.endDate,
      current: v.current,
      description: v.summary,
      summary: v.summary,
      details: v.location ? [v.location] : [],
    })),
  );

  // Achievements
  addSectionIfNotEmpty(
    "achievements",
    (master.achievements || []).map((ach) => ({
      id: ach.id,
      name: ach.title,
      title: ach.title,
      description: ach.description,
      summary: ach.description,
    })),
  );

  // Languages
  addSectionIfNotEmpty(
    "languages",
    (master.languages || []).map((l) => ({
      id: l.id,
      name: l.language,
      title: l.language,
      level: l.fluency,
      issuer: l.fluency,
      description: l.fluency,
      summary: l.fluency,
    })),
  );

  // Interests
  addSectionIfNotEmpty(
    "interests",
    (master.interests || []).map((i) => ({
      id: i.id,
      name: i.name,
      title: i.name,
      details: i.keywords || [],
      tags: i.keywords || [],
    })),
  );

  // Contact (always emitted last)
  sections.push({
    id: "section-contact",
    type: "contact",
    title: SECTION_TITLE_DEFAULTS.contact,
    subtitle: SECTION_SUBTITLE_DEFAULTS.contact,
    visible: true,
    items: [],
  });

  return {
    schemaVersion: 1,
    templateId: options.templateId,
    identity,
    seo,
    socialLinks,
    sections,
  };
}
