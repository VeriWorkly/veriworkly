import type {
  MasterProfileAward,
  MasterProfileFluency,
  MasterProfileInterest,
  MasterProfileLanguage,
  MasterProfileReference,
  MasterProfileVolunteer,
  MasterProfileAchievement,
  MasterProfileCertificate,
  MasterProfileCustomItem,
  MasterProfilePublication,
  MasterProfileCustomSection,
} from "../schema/types.js";

import { createId } from "../common/primitives.js";
import { isHttpUrl, monthDatePattern } from "../common/primitives.js";

/**
 * The one place that describes how the old flattened section model becomes the typed one.
 *
 * Before this, eight of a profile's sections lived twice: as typed arrays on the master
 * profile, and — mirrored on every save — as entries in `customSections`, whose item shape
 * is a single flat `{name, issuer, date, link, referenceId, description, details}` record
 * shared by all of them. The mirror was lossy and one-way: a reference's phone number was
 * written into a field named `date`, a language's fluency was duplicated into `issuer` and
 * `description`, and a volunteer's dates were concatenated into the display string
 * `"2020-01 - Present"`. Resumes only ever had the flattened copy, so that is the shape
 * every stored document is in.
 *
 * This module inverts the mapping. It runs on read, everywhere a profile or a resume is
 * normalised, and is deliberately total: every field may be missing, of the wrong type, or
 * malformed, and none of that may throw. A value it cannot interpret is dropped, never
 * guessed.
 *
 * A typed array that already has entries WINS. Master profiles carry both copies (typed
 * arrays plus the mirror), so for them this is a strip; resumes carry only the flattened
 * copy, so for them it is a recovery. One function covers both because "prefer the typed
 * array, otherwise unflatten" describes both cases exactly.
 */

/** The eight `customSections` kinds that were mirrors of a typed array, not real sections. */
export const LEGACY_COMPATIBILITY_KINDS = [
  "certifications",
  "awards",
  "publications",
  "languages",
  "interests",
  "volunteer",
  "references",
  "achievements",
] as const;

export type LegacyCompatibilityKind = (typeof LEGACY_COMPATIBILITY_KINDS)[number];

/** The typed arrays this migration produces, plus the `customSections` that survive it. */
export interface TypedProfileSections {
  languages: MasterProfileLanguage[];
  interests: MasterProfileInterest[];
  awards: MasterProfileAward[];
  certificates: MasterProfileCertificate[];
  publications: MasterProfilePublication[];
  volunteer: MasterProfileVolunteer[];
  references: MasterProfileReference[];
  achievements: MasterProfileAchievement[];
  customSections: MasterProfileCustomSection[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTextList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Only `http(s)` values reach a template's `href`; anything else is dropped, not repaired. */
function asUrlOrEmpty(value: unknown): string {
  const trimmed = asText(value);
  return trimmed && isHttpUrl(trimmed) ? trimmed : "";
}

/**
 * `YYYY-MM`, or nothing. A single-digit month is padded because the old month input emitted
 * both forms; free text ("May 2023") has no lossless home in a `monthDateSchema` field and
 * is dropped rather than guessed at.
 */
function asMonthDate(value: unknown): string {
  const trimmed = asText(value);
  if (monthDatePattern.test(trimmed)) return trimmed;

  const shortMonth = /^(\d{4})-(\d)$/.exec(trimmed);
  return shortMonth ? `${shortMonth[1]}-0${shortMonth[2]}` : "";
}

/**
 * The two producers of a flattened language row used different vocabularies: the master
 * mirror wrote the schema enum ("native"), the resume editor wrote its own display list
 * ("Beginner", "Intermediate", "Advanced"). Both are mapped; anything unrecognised becomes
 * "professional", which is the least wrong default for a language someone bothered to list.
 */
const FLUENCY_ALIASES: Record<string, MasterProfileFluency> = {
  elementary: "elementary",
  beginner: "elementary",
  basic: "elementary",
  limited: "limited",
  intermediate: "limited",
  professional: "professional",
  advanced: "professional",
  working: "professional",
  fluent: "fluent",
  native: "native",
  bilingual: "native",
};

function asFluency(value: unknown): MasterProfileFluency {
  return FLUENCY_ALIASES[asText(value).toLowerCase()] ?? "professional";
}

function asCustomItem(value: unknown, index: number): MasterProfileCustomItem {
  const item = isRecord(value) ? value : {};

  return {
    id: asText(item.id) || createId(`item-${index + 1}`),
    name: asText(item.name),
    issuer: asText(item.issuer),
    date: asText(item.date),
    link: asText(item.link),
    referenceId: asText(item.referenceId),
    description: asText(item.description),
    details: asTextList(item.details),
  };
}

/** The flattened items of one legacy section, or `[]` when the section is not present. */
function collectLegacyItems(sections: unknown, kind: LegacyCompatibilityKind) {
  return asArray(sections)
    .filter((section) => isRecord(section) && section.kind === kind)
    .flatMap((section) => asArray((section as Record<string, unknown>).items))
    .map(asCustomItem);
}

function makeId(item: MasterProfileCustomItem, kind: LegacyCompatibilityKind, index: number) {
  return item.id || createId(`${kind}-${index + 1}`);
}

function toCertificates(items: MasterProfileCustomItem[]): MasterProfileCertificate[] {
  return items.map((item, index) => ({
    id: makeId(item, "certifications", index),
    title: item.name,
    issuer: item.issuer,
    date: asMonthDate(item.date),
    website: asUrlOrEmpty(item.link),
    referenceId: item.referenceId || undefined,
    description: item.description,
    showLink: Boolean(asUrlOrEmpty(item.link)),
  }));
}

function toAwards(items: MasterProfileCustomItem[]): MasterProfileAward[] {
  return items.map((item, index) => ({
    id: makeId(item, "awards", index),
    title: item.name,
    awarder: item.issuer,
    date: asMonthDate(item.date),
    website: asUrlOrEmpty(item.link),
    description: item.description,
    showLink: Boolean(asUrlOrEmpty(item.link)),
  }));
}

function toPublications(items: MasterProfileCustomItem[]): MasterProfilePublication[] {
  return items.map((item, index) => ({
    id: makeId(item, "publications", index),
    title: item.name,
    publisher: item.issuer,
    date: asMonthDate(item.date),
    website: asUrlOrEmpty(item.link),
    description: item.description,
    showLink: Boolean(asUrlOrEmpty(item.link)),
  }));
}

function toLanguages(items: MasterProfileCustomItem[]): MasterProfileLanguage[] {
  return items.map((item, index) => ({
    id: makeId(item, "languages", index),
    language: item.name,
    fluency: asFluency(item.issuer || item.referenceId || item.description),
  }));
}

function toInterests(items: MasterProfileCustomItem[]): MasterProfileInterest[] {
  return items.map((item, index) => ({
    id: makeId(item, "interests", index),
    name: item.name,
    keywords: item.details,
  }));
}

function toVolunteer(items: MasterProfileCustomItem[]): MasterProfileVolunteer[] {
  return items.map((item, index) => {
    const [rawStart = "", rawEnd = ""] = item.date.split(/\s+[-–—]\s+/, 2);
    const current = rawEnd.toLowerCase() === "present";

    return {
      id: makeId(item, "volunteer", index),
      organization: item.name,
      role: item.issuer,
      startDate: asMonthDate(rawStart),
      endDate: current ? "" : asMonthDate(rawEnd),
      current,
      location: item.details[0] || item.referenceId,
      summary: item.description,
    };
  });
}

function toReferences(items: MasterProfileCustomItem[]): MasterProfileReference[] {
  return items.map((item, index) => {
    const editorShaped = Boolean(item.referenceId);
    const [mirroredTitle = "", mirroredRelationship = ""] = item.description.split(" / ", 2);

    return {
      id: makeId(item, "references", index),
      name: item.name,
      title: editorShaped ? item.issuer : mirroredTitle,
      organization: editorShaped ? item.description : item.issuer,
      relationship: editorShaped ? item.referenceId : mirroredRelationship,
      email: item.link.replace(/^mailto:/i, "").trim() || undefined,
      phone: item.details[0] || item.date || undefined,
    };
  });
}

function toAchievements(items: MasterProfileCustomItem[]): MasterProfileAchievement[] {
  return items.map((item, index) => ({
    id: makeId(item, "achievements", index),
    title: item.name,
    description: item.description,
  }));
}

function keepTyped<T>(existing: unknown, recovered: T[]): T[] {
  return Array.isArray(existing) && existing.length > 0 ? (existing as T[]) : recovered;
}

/**
 * Reads a stored profile or resume and returns its eight typed arrays plus the
 * `customSections` that are genuinely custom.
 *
 * Total by construction: `value` may be anything at all, including `undefined`.
 */
export function unflattenLegacySections(value: unknown): TypedProfileSections {
  const source = isRecord(value) ? value : {};
  const sections = source.customSections;

  const items = (kind: LegacyCompatibilityKind) => collectLegacyItems(sections, kind);

  return {
    certificates: keepTyped(source.certificates, toCertificates(items("certifications"))),
    awards: keepTyped(source.awards, toAwards(items("awards"))),
    publications: keepTyped(source.publications, toPublications(items("publications"))),
    languages: keepTyped(source.languages, toLanguages(items("languages"))),
    interests: keepTyped(source.interests, toInterests(items("interests"))),
    volunteer: keepTyped(source.volunteer, toVolunteer(items("volunteer"))),
    references: keepTyped(source.references, toReferences(items("references"))),
    achievements: keepTyped(source.achievements, toAchievements(items("achievements"))),
    customSections: asArray(sections)
      .filter((section) => isRecord(section) && section.kind === "custom")
      .map((section, index) => {
        const record = section as Record<string, unknown>;

        return {
          id: asText(record.id) || createId(`custom-${index + 1}`),
          kind: "custom" as const,
          title: asText(record.title),
          items: asArray(record.items).map(asCustomItem),
          editableTitle: typeof record.editableTitle === "boolean" ? record.editableTitle : true,
        };
      }),
  };
}

/** True when `value` still carries a mirrored section, i.e. it predates this migration. */
export function hasLegacyCompatibilitySections(value: unknown): boolean {
  const source = isRecord(value) ? value : {};

  return asArray(source.customSections).some(
    (section) =>
      isRecord(section) &&
      LEGACY_COMPATIBILITY_KINDS.includes(section.kind as LegacyCompatibilityKind),
  );
}
