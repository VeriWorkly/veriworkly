import type { ResumeData, ResumeLinkItem, ResumeLinkType } from "@/types/resume";

import { defaultResume, defaultSections } from "@/features/resume/constants/default-resume";
import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";

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
  if (value === "website") {
    return "portfolio";
  }

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

  const legacyBasics = (value?.basics ?? {}) as Partial<
    ResumeData["basics"] & {
      website?: string;
      github?: string;
      linkedin?: string;
    }
  >;

  const migratedItems: ResumeLinkItem[] = [
    {
      type: "portfolio" as ResumeLinkType,
      label: "",
      url: legacyBasics.website || "",
      id: "",
    },
    {
      type: "github" as ResumeLinkType,
      label: "",
      url: legacyBasics.github || "",
      id: "",
    },
    {
      type: "linkedin" as ResumeLinkType,
      label: "",
      url: legacyBasics.linkedin || "",
      id: "",
    },
  ]
    .filter((item) => item.url.trim().length > 0)
    .map((item, index) => ({
      ...item,
      id: `link-${index + 1}`,
    }));

  return {
    ...defaultResume.links,
    items: migratedItems,
  };
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
  // Migration map: forwards old/legacy template IDs to the current canonical slugs.
  // Old IDs are kept here permanently so existing stored resumes are silently upgraded.
  const templateAliases: Record<string, string> = {
    // v1 internal names → v2 canonical slugs
    "clean-professional": "executive-clarity",
    modern: "executive-clarity",
    "compact-ats": "precision-ats",
    faang: "precision-ats",
    ats: "precision-ats",
  };
  const normalizedTemplateId = value?.templateId
    ? (templateAliases[value.templateId] ?? value.templateId)
    : undefined;

  const incomingCustomization = value?.customization;
  const incomingFontFamily = (incomingCustomization as { fontFamily?: string } | undefined)
    ?.fontFamily;

  return {
    ...defaultResume,
    ...value,
    templateId: normalizedTemplateId ?? defaultResume.templateId,
    basics: {
      ...defaultResume.basics,
      ...value?.basics,
    },
    links: normalizeLinks(value),
    experience: value?.experience
      ? value.experience.map((item) => ({
          ...item,
          startDate: normalizeMonthDate(item.startDate),
          endDate: normalizeMonthDate(item.endDate),
          current: item.current ?? item.endDate?.trim().toLowerCase() === "present",
        }))
      : defaultResume.experience,
    education: value?.education?.length
      ? value.education.map((item) => ({
          ...item,
          startDate: normalizeNumericDate(item.startDate, 4),
          endDate: normalizeNumericDate(item.endDate, 4),
          current: item.current ?? item.endDate?.trim().toLowerCase() === "present",
        }))
      : defaultResume.education,
    projects: value?.projects
      ? value.projects.map((project) => ({
          ...project,
          linkLabel: project.linkLabel || "Link",
          showLinkAsText: project.showLinkAsText ?? true,
          skills: project.skills ?? [],
        }))
      : defaultResume.projects,
    skills: value?.skills?.length ? value.skills : defaultResume.skills,
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
