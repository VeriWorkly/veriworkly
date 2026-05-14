import type {
  ResumeAward,
  ResumeSection,
  ResumeLanguage,
  ResumeInterest,
  ResumeReference,
  ResumeVolunteer,
  ResumeSkillGroup,
  MasterProfileData,
  ResumeAchievement,
  ResumeCertificate,
  ResumeProjectItem,
  ResumePublication,
  ResumeCustomSection,
  ResumeEducationItem,
  ResumeExperienceItem,
} from "@/types/resume";

import { fontOptions } from "@/features/documents/constants/fonts";
import {
  isMonthDate,
  isTenDigitPhone,
  isYearDate,
} from "@/features/resume/schemas/resume-validation-rules";

export const linkTypes = ["github", "linkedin", "portfolio"] as const;
export const fontFamilies = fontOptions.map((font) => font.value);

export const fluencyOptions: ResumeLanguage["fluency"][] = [
  "elementary",
  "limited",
  "professional",
  "fluent",
  "native",
];

export const sectionLabels: Record<ResumeSection["id"], string> = {
  basics: "Basics",
  links: "Links",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  awards: "Awards",
  publications: "Publications",
  languages: "Languages",
  interests: "Interests",
  volunteer: "Volunteer",
  references: "References",
  achievements: "Achievements",
  custom: "Custom",
};

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinLines(values: string[]) {
  return values.join("\n");
}

export function toUrl(value: string) {
  return value.trim();
}

export function isValidEmail(value: string) {
  if (!value) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidAbsoluteUrl(value: string) {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeAbsoluteUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isFiniteNumber(value: number) {
  return Number.isFinite(value) && !Number.isNaN(value);
}

export function validateMasterProfileForSave(profile: MasterProfileData) {
  const issues: string[] = [];

  if (!isValidEmail(profile.basics.email.trim())) {
    issues.push("Basics email must be a valid email address.");
  }

  if (!isTenDigitPhone(profile.basics.phone.trim())) {
    issues.push("Basics phone must have exactly 10 digits.");
  }

  for (const link of profile.links.items) {
    if (!isValidAbsoluteUrl(link.url.trim())) {
      issues.push(`Link \"${link.label || link.type}\" must be a valid URL.`);
      break;
    }
  }

  for (const project of profile.projects) {
    if (project.link.trim() && !isValidAbsoluteUrl(project.link.trim())) {
      issues.push(`Project \"${project.name || "Untitled"}\" has an invalid link URL.`);
      break;
    }
  }

  for (const experience of profile.experience) {
    if (
      !isMonthDate(experience.startDate) ||
      (!experience.current && !isMonthDate(experience.endDate))
    ) {
      issues.push(`Experience "${experience.role || "Untitled"}" must use YYYY-MM dates.`);
      break;
    }
  }

  for (const education of profile.education) {
    if (
      !isYearDate(education.startDate) ||
      (!education.current && !isYearDate(education.endDate))
    ) {
      issues.push(`Education "${education.degree || "Untitled"}" must use year-only dates.`);
      break;
    }
  }

  for (const award of profile.awards) {
    if (award.website?.trim() && !isValidAbsoluteUrl(award.website.trim())) {
      issues.push(`Award \"${award.title || "Untitled"}\" has an invalid website URL.`);
      break;
    }

    if (!isMonthDate(award.date)) {
      issues.push(`Award \"${award.title || "Untitled"}\" must use a YYYY-MM date.`);
      break;
    }
  }

  for (const certificate of profile.certificates) {
    if (certificate.website?.trim() && !isValidAbsoluteUrl(certificate.website.trim())) {
      issues.push(`Certificate \"${certificate.title || "Untitled"}\" has an invalid website URL.`);
      break;
    }

    if (!isMonthDate(certificate.date)) {
      issues.push(`Certificate \"${certificate.title || "Untitled"}\" must use a YYYY-MM date.`);
      break;
    }
  }

  for (const publication of profile.publications) {
    if (publication.website?.trim() && !isValidAbsoluteUrl(publication.website.trim())) {
      issues.push(`Publication \"${publication.title || "Untitled"}\" has an invalid website URL.`);
      break;
    }

    if (!isMonthDate(publication.date)) {
      issues.push(`Publication \"${publication.title || "Untitled"}\" must use a YYYY-MM date.`);
      break;
    }
  }

  for (const volunteer of profile.volunteer) {
    if (
      !isMonthDate(volunteer.startDate) ||
      (!volunteer.current && !isMonthDate(volunteer.endDate))
    ) {
      issues.push(`Volunteer "${volunteer.organization || "Untitled"}" must use YYYY-MM dates.`);
      break;
    }
  }

  for (const reference of profile.references) {
    if (reference.email?.trim() && !isValidEmail(reference.email.trim())) {
      issues.push(`Reference \"${reference.name || "Unnamed"}\" has an invalid email.`);
      break;
    }

    if (reference.phone?.trim() && !isTenDigitPhone(reference.phone.trim())) {
      issues.push(
        `Reference \"${reference.name || "Unnamed"}\" phone must have exactly 10 digits.`,
      );
      break;
    }
  }

  const customization = profile.customization;
  const numericChecks: Array<[string, number]> = [
    ["Section Spacing", customization.sectionSpacing],
    ["Page Padding", customization.pagePadding],
    ["Body Line Height", customization.bodyLineHeight],
    ["Heading Line Height", customization.headingLineHeight],
  ];

  for (const [label, value] of numericChecks) {
    if (!isFiniteNumber(value)) {
      issues.push(`${label} must be a valid number.`);
      break;
    }
  }

  if (customization.sectionSpacing < 0 || customization.sectionSpacing > 200) {
    issues.push("Section Spacing must be between 0 and 200.");
  }

  if (customization.pagePadding < 0 || customization.pagePadding > 200) {
    issues.push("Page Padding must be between 0 and 200.");
  }

  if (customization.bodyLineHeight < 0.8 || customization.bodyLineHeight > 3) {
    issues.push("Body Line Height must be between 0.8 and 3.");
  }

  if (customization.headingLineHeight < 0.8 || customization.headingLineHeight > 3) {
    issues.push("Heading Line Height must be between 0.8 and 3.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function sanitizeMasterProfileForSave(profile: MasterProfileData): MasterProfileData {
  return {
    ...profile,
    basics: {
      ...profile.basics,
      fullName: profile.basics.fullName.trim(),
      role: profile.basics.role.trim(),
      headline: profile.basics.headline.trim(),
      email: profile.basics.email.trim().toLowerCase(),
      phone: profile.basics.phone.replace(/\D/g, "").slice(0, 10),
      location: profile.basics.location.trim(),
    },
    links: {
      ...profile.links,
      items: profile.links.items.map((item) => ({
        ...item,
        url: normalizeAbsoluteUrl(item.url),
      })),
    },
    projects: profile.projects.map((item) => ({
      ...item,
      name: item.name.trim(),
      role: item.role.trim(),
      link: normalizeAbsoluteUrl(item.link),
      linkLabel: item.linkLabel?.trim() || "Link",
      showLinkAsText: item.showLinkAsText ?? true,
      summary: item.summary.trim(),
      skills: item.skills ?? [],
    })),
    experience: profile.experience.map((item) => ({
      ...item,
      startDate: item.startDate.trim(),
      endDate: item.current ? "" : item.endDate.trim(),
    })),
    education: profile.education.map((item) => ({
      ...item,
      startDate: item.startDate.replace(/\D/g, "").slice(0, 4),
      endDate: item.current ? "" : item.endDate.replace(/\D/g, "").slice(0, 4),
    })),
    awards: profile.awards.map((item) => ({
      ...item,
      title: item.title.trim(),
      awarder: item.awarder.trim(),
      website: normalizeAbsoluteUrl(item.website ?? ""),
      description: item.description.trim(),
    })),
    certificates: profile.certificates.map((item) => ({
      ...item,
      title: item.title.trim(),
      issuer: item.issuer.trim(),
      website: normalizeAbsoluteUrl(item.website ?? ""),
      description: item.description.trim(),
    })),
    publications: profile.publications.map((item) => ({
      ...item,
      title: item.title.trim(),
      publisher: item.publisher.trim(),
      website: normalizeAbsoluteUrl(item.website ?? ""),
      description: item.description.trim(),
    })),
    references: profile.references.map((item) => ({
      ...item,
      name: item.name.trim(),
      title: item.title.trim(),
      organization: item.organization.trim(),
      relationship: item.relationship.trim(),
      email: (item.email ?? "").trim().toLowerCase(),
      phone: (item.phone ?? "").replace(/\D/g, "").slice(0, 10),
    })),
    volunteer: profile.volunteer.map((item) => ({
      ...item,
      startDate: item.startDate.trim(),
      endDate: item.current ? "" : item.endDate.trim(),
    })),
  };
}

export function ensureUniqueIds<T extends { id: string }>(items: T[], prefix: string) {
  const seen = new Set<string>();

  return items.map((item) => {
    let nextId = item.id?.trim() || createId(prefix);

    while (seen.has(nextId)) {
      nextId = createId(prefix);
    }

    seen.add(nextId);

    if (nextId === item.id) {
      return item;
    }

    return {
      ...item,
      id: nextId,
    };
  });
}

export function normalizeProfileIds(profile: MasterProfileData): MasterProfileData {
  const normalizedCustomSections = ensureUniqueIds(profile.customSections, "custom").map(
    (section) => ({
      ...section,
      items: ensureUniqueIds(section.items, "custom-item"),
    }),
  );

  return {
    ...profile,
    customSections: normalizedCustomSections,
  };
}

export function emptyExperience(): ResumeExperienceItem {
  return {
    id: createId("experience"),
    company: "",
    role: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    summary: "",
    highlights: [],
  };
}

export function emptyEducation(): ResumeEducationItem {
  return {
    id: createId("education"),
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    current: false,
    summary: "",
  };
}

export function emptyProject(): ResumeProjectItem {
  return {
    id: createId("project"),
    name: "",
    role: "",
    link: "",
    linkLabel: "Link",
    showLinkAsText: true,
    summary: "",
    highlights: [],
    skills: [],
  };
}

export function emptySkill(): ResumeSkillGroup {
  return {
    id: createId("skill"),
    name: "",
    keywords: [],
  };
}

export function emptyLanguage(): ResumeLanguage {
  return {
    id: createId("language"),
    language: "",
    fluency: "professional",
  };
}

export function emptyInterest(): ResumeInterest {
  return {
    id: createId("interest"),
    name: "",
    keywords: [],
  };
}

export function emptyAward(): ResumeAward {
  return {
    id: createId("award"),
    title: "",
    awarder: "",
    date: "",
    website: "",
    description: "",
    showLink: false,
  };
}

export function emptyCertificate(): ResumeCertificate {
  return {
    id: createId("certificate"),
    title: "",
    issuer: "",
    date: "",
    website: "",
    description: "",
    showLink: false,
  };
}

export function emptyPublication(): ResumePublication {
  return {
    id: createId("publication"),
    title: "",
    publisher: "",
    date: "",
    website: "",
    description: "",
    showLink: false,
  };
}

export function emptyVolunteer(): ResumeVolunteer {
  return {
    id: createId("volunteer"),
    organization: "",
    role: "",
    startDate: "",
    endDate: "",
    current: false,
    location: "",
    summary: "",
  };
}

export function emptyReference(): ResumeReference {
  return {
    id: createId("reference"),
    name: "",
    title: "",
    organization: "",
    email: "",
    phone: "",
    relationship: "",
  };
}

export function emptyAchievement(): ResumeAchievement {
  return {
    id: createId("achievement"),
    title: "",
    description: "",
  };
}

export function emptyCustomSection(): ResumeCustomSection {
  return {
    id: createId("custom"),
    kind: "custom",
    title: "Other",
    items: [],
    editableTitle: true,
  };
}

export function updateItem<T extends { id: string }>(
  items: T[],
  id: string,
  updater: (item: T) => T,
) {
  return items.map((item) => (item.id === id ? updater(item) : item));
}

export function removeItem<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}
