import { unflattenLegacySections } from "@veriworkly/profile-core";

import type { ResumeData, ResumeLinkType, ResumeSection } from "@/types/resume";

import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";
import { isDocumentLinkType } from "@/features/documents/core/link-types";
import { blankResume, defaultSections } from "@/features/resume/constants/default-resume";

function normalizeLinkType(value: string | undefined): ResumeLinkType {
  return isDocumentLinkType(value) ? value : "portfolio";
}

function normalizeLinks(value: Partial<ResumeData> | null | undefined) {
  const incomingLinks = value?.links;

  if (incomingLinks) {
    return {
      displayMode: incomingLinks.displayMode ?? blankResume.links.displayMode,
      items: (incomingLinks.items ?? []).map((item, index) => ({
        id: item.id || `link-${index + 1}`,
        type: normalizeLinkType(item.type),
        label: item.label || "",
        url: item.url || "",
      })),
    };
  }

  return blankResume.links;
}

/**
 * Every custom section survives, in the order it arrived.
 *
 * The eight legacy kinds are not synthesised here: `unflattenLegacySections` has already
 * turned them into typed arrays by the time this runs.
 */
function normalizeCustomSections(sections: ResumeData["customSections"]) {
  const usedIds = new Set<string>();

  return sections.map((section, index) => {
    let id = section.id?.trim() || `custom-${index + 1}`;

    // Duplicate ids make React reconcile the wrong card and make "delete this one"
    // ambiguous, so a collision is renamed rather than reported.
    while (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }

    usedIds.add(id);

    return {
      ...section,
      id,
      kind: "custom" as const,
      title: section.title ?? "",
      editableTitle: section.editableTitle ?? true,
      items: (section.items ?? []).map((entry, itemIndex) => ({
        id: entry.id || `${id}-${itemIndex + 1}`,
        name: entry.name || "",
        issuer: entry.issuer || "",
        date: entry.date || "",
        link: entry.link || "",
        referenceId: entry.referenceId || "",
        description: entry.description || "",
        details: entry.details ?? [],
      })),
    };
  });
}

/**
 * The fixed sections in their user-chosen order, then one entry per custom section.
 *
 * A custom entry is addressed by `customSectionId`, not by `id`: "custom" is one member of
 * a closed enum, so ordering and visibility for several custom sections cannot be expressed
 * with the id alone.
 */
function normalizeSections(
  value: Partial<ResumeData> | null | undefined,
  customSections: ResumeData["customSections"],
): ResumeSection[] {
  const incoming = value?.sections ?? [];
  const fixedDefaults = defaultSections.filter((section) => section.id !== "custom");

  const merged = fixedDefaults.map((fallback) => {
    const existing = incoming.find((section) => section.id === fallback.id);

    return existing ? { ...fallback, ...existing } : fallback;
  });

  const basicsSection = merged.find((s) => s.id === "basics") ?? defaultSections[0];
  const linksSection = merged.find((s) => s.id === "links") ?? defaultSections[1];
  const otherSections = merged
    .filter((s) => s.id !== "basics" && s.id !== "links")
    .sort((left, right) => left.order - right.order);

  /*
   * Custom entries keep whatever position the stored document gave them, matched on
   * `customSectionId`. A document written before this field existed has one unmatched
   * "custom" entry; its position is reused for the first custom section so an existing
   * resume does not silently reorder itself.
   */
  const legacyCustomEntry = incoming.find(
    (section) => section.id === "custom" && !section.customSectionId,
  );

  const customEntries: ResumeSection[] = customSections.map((section, index) => {
    const stored =
      incoming.find((entry) => entry.id === "custom" && entry.customSectionId === section.id) ??
      (index === 0 ? legacyCustomEntry : undefined);

    return {
      id: "custom",
      label: section.title || "Custom",
      visible: stored?.visible ?? true,
      order: stored?.order ?? defaultSections.length + index,
      ...(stored?.column ? { column: stored.column } : {}),
      customSectionId: section.id,
    };
  });

  const ordered = [...otherSections, ...customEntries].sort(
    (left, right) => left.order - right.order,
  );

  return [
    { ...basicsSection, order: 0 },
    { ...linksSection, order: 1 },
    ...ordered.map((section, index) => ({ ...section, order: index + 2 })),
  ];
}

function normalizeNumericDate(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\D/g, "").slice(0, maxLength);
}

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function toMonthDate(year: string, month: number): string | null {
  return month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}` : null;
}

/** 1-12 for a month name or its abbreviation ("May", "Sept", "January"), else 0. */
function monthFromName(name: string): number {
  const lower = name.toLowerCase();

  return lower.length < 3 ? 0 : MONTH_NAMES.findIndex((month) => month.startsWith(lower)) + 1;
}

/**
 * An experience date as stored, `YYYY-MM`. Safari and Firefox show the month field as a
 * plain text box, so the common hand-typed forms ("May 2020", "05/2020", "2020-5") are read
 * into it, and anything else is kept as typed: blanking it dropped the date from the saved
 * copy and every export. "Present" is not a date; `current` carries it.
 */
export function normalizeMonthDate(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed || /^(present|current|now)$/i.test(trimmed)) return "";

  const yearFirst = /^(\d{4})[-/.](\d{1,2})$/.exec(trimmed);
  if (yearFirst) return toMonthDate(yearFirst[1], Number(yearFirst[2])) ?? trimmed;

  const monthFirst = /^(\d{1,2})[-/.](\d{4})$/.exec(trimmed);
  if (monthFirst) return toMonthDate(monthFirst[2], Number(monthFirst[1])) ?? trimmed;

  const named = /^([a-z]+)\.?,?\s+(\d{4})$/i.exec(trimmed);
  if (named) return toMonthDate(named[2], monthFromName(named[1])) ?? trimmed;

  return trimmed;
}

/**
 * A custom section stored without an id gets one from its position before the shared
 * migration runs, which would mint a random one on every read. Order and visibility are
 * keyed by that id, so a new one on each read lost both.
 */
function withStableCustomSectionIds(value: Partial<ResumeData> | null | undefined) {
  const sections: unknown = value?.customSections;

  if (!value || !Array.isArray(sections)) return value;

  return {
    ...value,
    customSections: sections.map((section, index) =>
      section && typeof section === "object" && !(section as { id?: unknown }).id
        ? { ...section, id: `custom-${index + 1}` }
        : section,
    ),
  };
}

export function normalizeResumeData(value: Partial<ResumeData> | null | undefined): ResumeData {
  const incomingCustomization = value?.customization;
  const incomingFontFamily = (incomingCustomization as { fontFamily?: string } | undefined)
    ?.fontFamily;

  /*
   * The forward migration, applied on read.
   *
   * Every resume stored before the typed model keeps its certificates, awards,
   * publications, languages, interests, volunteer entries, references and achievements
   * inside `customSections`, flattened into one shared item shape. This unflattens them
   * back into the typed arrays and leaves only genuinely custom sections behind. It runs on
   * every read — including reads of already-migrated documents, where a populated typed
   * array wins and the pass is a no-op — and the migrated shape is written back by the next
   * save, since every save normalises first.
   */
  const typed = unflattenLegacySections(withStableCustomSectionIds(value));
  const customSections = normalizeCustomSections(typed.customSections);

  return {
    ...blankResume,
    ...value,
    templateId: value?.templateId ?? blankResume.templateId,
    basics: {
      ...blankResume.basics,
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
        : blankResume.experience,
    education:
      value?.education !== undefined && value?.education !== null
        ? value.education.map((item) => ({
            ...item,
            startDate: normalizeNumericDate(item.startDate, 4),
            endDate: normalizeNumericDate(item.endDate, 4),
            current: item.current ?? item.endDate?.trim().toLowerCase() === "present",
          }))
        : blankResume.education,
    projects:
      value?.projects !== undefined && value?.projects !== null
        ? value.projects.map((project) => ({
            ...project,
            linkLabel: project.linkLabel ?? "",
            showLinkAsText: project.showLinkAsText ?? true,
            skills: project.skills ?? [],
          }))
        : blankResume.projects,
    skills:
      value?.skills !== undefined && value?.skills !== null ? value.skills : blankResume.skills,
    languages: typed.languages,
    interests: typed.interests,
    awards: typed.awards,
    certificates: typed.certificates,
    publications: typed.publications,
    volunteer: typed.volunteer,
    references: typed.references,
    achievements: typed.achievements,
    customSections,
    sections: normalizeSections(value, customSections),
    customization: {
      ...blankResume.customization,
      ...incomingCustomization,
      fontFamily: normalizeFontFamilyId(incomingFontFamily),
    },
    sync: {
      ...blankResume.sync,
      ...value?.sync,
    },
    updatedAt: value?.updatedAt ?? new Date().toISOString(),
  };
}
