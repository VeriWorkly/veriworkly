import type { ResumeData, ResumeLinkType } from "@/types/resume";

import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";
import { defaultResume, defaultSections } from "@/features/resume/constants/default-resume";

function isKnownLinkType(value: string): value is ResumeLinkType {
  return [
    "github",
    "linkedin",
    "dribbble",
    "twitter",
    "portfolio",
    "behance",
    "medium",
    "youtube",
    "custom",
  ].includes(value);
}

function normalizeLinkType(value: string | undefined): ResumeLinkType {
  return value && isKnownLinkType(value) ? value : "portfolio";
}

function normalizeLinks(value: Partial<ResumeData> | null | undefined) {
  const incomingLinks = value?.links;

  if (incomingLinks) {
    return {
      displayMode: incomingLinks.displayMode ?? defaultResume.links.displayMode,
      items: (incomingLinks.items ?? []).map((item, index) => ({
        id: item.id || `link-${index + 1}`,
        type: normalizeLinkType(item.type),
        label: item.label || "",
        url: item.url || "",
      })),
    };
  }

  return defaultResume.links;
}

function normalizeCustomSections(value: Partial<ResumeData> | null | undefined) {
  const incoming = value?.customSections ?? [];

  return defaultResume.customSections.map((fallback) => {
    const matching = incoming.find((item) => item.kind === fallback.kind);

    if (!matching) {
      return fallback;
    }

    return {
      ...fallback,
      ...matching,
      items: matching.items
        ? matching.items.map((entry, index) => ({
            id: entry.id || `${matching.kind}-${index + 1}`,
            name: entry.name || "",
            issuer: entry.issuer || "",
            date: entry.date || "",
            link: entry.link || "",
            referenceId: entry.referenceId || "",
            description: entry.description || "",
            details: entry.details ?? [],
          }))
        : fallback.items,
    };
  });
}

function normalizeSections(value: Partial<ResumeData> | null | undefined) {
  const incoming = value?.sections ?? [];

  if (!incoming.length) {
    return defaultSections;
  }

  const merged = defaultSections.map((fallback) => {
    const existing = incoming.find((section) => section.id === fallback.id);

    if (!existing) {
      return fallback;
    }

    return {
      ...fallback,
      ...existing,
    };
  });

  return merged
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((section, index) => ({
      ...section,
      order: index,
    }));
}

function normalizeNumericDate(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\D/g, "").slice(0, maxLength);
}

function normalizeMonthDate(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed) ? trimmed : "";
}

export function normalizeResumeData(value: Partial<ResumeData> | null | undefined): ResumeData {
  const incomingCustomization = value?.customization;
  const incomingFontFamily = (incomingCustomization as { fontFamily?: string } | undefined)
    ?.fontFamily;

  return {
    ...defaultResume,
    ...value,
    templateId: value?.templateId ?? defaultResume.templateId,
    basics: {
      ...defaultResume.basics,
      ...value?.basics,
    },
    links: normalizeLinks(value),
    experience:
      value?.experience !== undefined && value?.experience !== null
        ? value.experience.map((item) => ({
            ...item,
            startDate: normalizeMonthDate(item.startDate),
            endDate: normalizeMonthDate(item.endDate),
            current: item.current ?? item.endDate?.trim().toLowerCase() === "present",
          }))
        : defaultResume.experience,
    education:
      value?.education !== undefined && value?.education !== null
        ? value.education.map((item) => ({
            ...item,
            startDate: normalizeNumericDate(item.startDate, 4),
            endDate: normalizeNumericDate(item.endDate, 4),
            current: item.current ?? item.endDate?.trim().toLowerCase() === "present",
          }))
        : defaultResume.education,
    projects:
      value?.projects !== undefined && value?.projects !== null
        ? value.projects.map((project) => ({
            ...project,
            linkLabel: project.linkLabel || "Link",
            showLinkAsText: project.showLinkAsText ?? true,
            skills: project.skills ?? [],
          }))
        : defaultResume.projects,
    skills:
      value?.skills !== undefined && value?.skills !== null ? value.skills : defaultResume.skills,
    customSections: normalizeCustomSections(value),
    sections: normalizeSections(value),
    customization: {
      ...defaultResume.customization,
      ...incomingCustomization,
      fontFamily: normalizeFontFamilyId(incomingFontFamily),
    },
    sync: {
      ...defaultResume.sync,
      ...value?.sync,
    },
    updatedAt: value?.updatedAt ?? new Date().toISOString(),
  };
}
