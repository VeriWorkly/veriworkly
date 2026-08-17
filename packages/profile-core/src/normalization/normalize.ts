import { z } from "zod";

import { createId } from "../common/primitives.js";
import { migrateMasterProfile } from "../migrations/index.js";
import { createEmptyMasterProfile } from "../schema/defaults.js";
import {
  masterProfileSchema,
  masterProfileFieldSchemas,
  CURRENT_SCHEMA_VERSION,
} from "../schema/schema.js";
import type { MasterProfileData } from "../schema/types.js";
import { unflattenLegacySections } from "./legacy-sections.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalisation must never throw on valid or repairable input.
 *
 * It applies migrations forward, merges over a complete base profile, and validates with zod.
 */
export function normalizeMasterProfile(
  value: Partial<MasterProfileData> | null | undefined,
  base: MasterProfileData = createEmptyMasterProfile(),
): MasterProfileData {
  if (!value) {
    return base;
  }

  // 1. Run migrations first
  let migratedValue: Record<string, unknown> | Partial<MasterProfileData> = value;
  try {
    const migrationResult = migrateMasterProfile(value);
    if (isRecord(migrationResult)) {
      migratedValue = migrationResult as Partial<MasterProfileData>;
    }
  } catch (err) {
    // If a newer schema version is encountered, log and preserve value
    console.warn("Schema migration warning:", err);
  }

  // 2. Unflatten legacy sections
  const migrated = isRecord(migratedValue)
    ? { ...migratedValue, ...unflattenLegacySections(migratedValue) }
    : migratedValue;

  const nextProfile = {
    ...base,
    ...migrated,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    basics: {
      ...base.basics,
      ...migrated?.basics,
    },
    links: {
      ...base.links,
      ...migrated?.links,
      items: migrated?.links?.items ?? base.links.items,
    },
    experience: migrated?.experience?.length ? migrated.experience : base.experience,
    education: migrated?.education?.length ? migrated.education : base.education,
    projects: migrated?.projects?.length ? migrated.projects : base.projects,
    skills: migrated?.skills?.length ? migrated.skills : base.skills,
    languages: migrated?.languages?.length ? migrated.languages : base.languages,
    interests: migrated?.interests?.length ? migrated.interests : base.interests,
    awards: migrated?.awards?.length ? migrated.awards : base.awards,
    certificates: migrated?.certificates?.length ? migrated.certificates : base.certificates,
    publications: migrated?.publications?.length ? migrated.publications : base.publications,
    volunteer: migrated?.volunteer?.length ? migrated.volunteer : base.volunteer,
    references: migrated?.references?.length ? migrated.references : base.references,
    achievements: migrated?.achievements?.length ? migrated.achievements : base.achievements,
    customSections: migrated?.customSections?.length
      ? migrated.customSections
      : base.customSections,
    sections: migrated?.sections?.length ? migrated.sections : base.sections,
    customization: {
      ...base.customization,
      ...migrated?.customization,
    },
    updatedAt: migrated?.updatedAt ?? new Date().toISOString(),
  };

  const parsed = masterProfileSchema.safeParse(nextProfile);

  if (!parsed.success) {
    console.warn("Master profile did not fully validate; keeping the merged value.", {
      issues: parsed.error.issues,
    });

    return nextProfile as MasterProfileData;
  }

  return parsed.data;
}

/** Parses strictly, running migrations forward first and returning null rather than a partially-repaired object. */
export function parseMasterProfile(value: unknown): MasterProfileData | null {
  if (!value) return null;
  try {
    const migrated = migrateMasterProfile(value);
    const parsed = masterProfileSchema.safeParse(migrated);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** `z.array(x)` and `z.array(x).default([])` both have to yield `x`. */
function unwrapArrayElementSchema(schema: z.ZodTypeAny): z.ZodTypeAny | null {
  const inner = schema instanceof z.ZodDefault ? schema.removeDefault() : schema;
  return inner instanceof z.ZodArray ? (inner.element as z.ZodTypeAny) : null;
}

/**
 * Field-by-field rescue for a profile that fails whole-object validation.
 */
export function salvageMasterProfile(
  raw: unknown,
  base: MasterProfileData = createEmptyMasterProfile(),
): MasterProfileData {
  if (!isRecord(raw)) {
    return base;
  }

  let migratedRaw: Record<string, unknown> = raw;
  try {
    const migrated = migrateMasterProfile(raw);
    if (isRecord(migrated)) {
      migratedRaw = migrated;
    }
  } catch {
    // If migration errors (e.g. newer schema version), preserve raw fields for salvage
  }

  const salvaged: Record<string, unknown> = { ...base };

  for (const [key, fieldSchema] of Object.entries(masterProfileFieldSchemas)) {
    if (!(key in migratedRaw)) continue;

    const incoming = migratedRaw[key];
    const parsed = (fieldSchema as z.ZodTypeAny).safeParse(incoming);

    if (parsed.success) {
      salvaged[key] = parsed.data;
      continue;
    }

    const elementSchema = unwrapArrayElementSchema(fieldSchema as z.ZodTypeAny);

    if (!elementSchema || !Array.isArray(incoming)) continue;

    const survivors = incoming
      .map((entry) => elementSchema.safeParse(entry))
      .filter((result) => result.success)
      .map((result) => result.data);

    if (survivors.length > 0) {
      salvaged[key] = survivors;
    }
  }

  return normalizeMasterProfile(salvaged as Partial<MasterProfileData>, base);
}

/**
 * Duplicate ids inside a repeated section make React reconcile the wrong rows and make
 * "delete this one" ambiguous, so collisions are reassigned rather than reported.
 */
export function ensureUniqueIds<T extends { id: string }>(items: T[], prefix: string): T[] {
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
