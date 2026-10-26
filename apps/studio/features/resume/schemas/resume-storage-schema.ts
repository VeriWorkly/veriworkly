import { z } from "zod";

import type { ResumeData } from "@/types/resume";

import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";

const resumeSectionIdSchema = z.enum([
  "basics",
  "links",
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "awards",
  "publications",
  "languages",
  "interests",
  "volunteer",
  "references",
  "achievements",
  "custom",
]);

const resumeAdditionalSectionKindSchema = z.enum([
  "certifications",
  "awards",
  "publications",
  "languages",
  "interests",
  "volunteer",
  "references",
  "achievements",
  "custom",
]);

const resumeFluencySchema = z.enum(["elementary", "limited", "professional", "fluent", "native"]);

export const documentSyncStatusSchema = z.enum([
  "local-only",
  "pending",
  "syncing",
  "synced",
  "conflicted",
]);

/**
 * A stored sync state with every key optional: callers merge it over the state they already
 * hold, so a key absent here must stay absent rather than be defaulted.
 */
export const documentSyncStateSchema = z
  .object({
    enabled: z.boolean(),
    status: documentSyncStatusSchema,
    cloudDocumentId: z.string().nullable(),
    lastSyncedAt: z.string().nullable(),
    revision: z.number().int(),
  })
  .partial();

const resumeFontFamilySchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => normalizeFontFamilyId(value));

/*
 * Storage checks shape, never content. An email of "j", a phone of "+1 5" or a half-typed
 * date is what the user has typed so far, and refusing to store it loses their text. The
 * content rules apply only in the editor's validation.
 */
const text = z.string().default("");
const textList = z.array(z.string()).default([]);

/**
 * The stored resume shape.
 *
 * Fields inside a list entry default when absent, so an entry written before a field existed
 * still reads as a complete entry. `current` on experience and education is the exception:
 * normalisation derives it from an end date of "Present" when it is missing.
 *
 * Every top-level key is optional. `.partial()` adds no defaults, so a key the stored payload
 * lacks stays absent and `normalizeResumeData` can tell "missing" from "empty".
 */
const resumeDataInputSchema = z
  .object({
    id: z.string(),
    templateId: z.string(),
    title: z.string(),
    basics: z
      .object({
        fullName: z.string(),
        role: z.string(),
        headline: z.string(),
        email: z.string(),
        phone: z.string(),
        location: z.string(),
        linkEmail: z.boolean(),
        linkPhone: z.boolean(),
        linkLocation: z.boolean(),
      })
      .partial(),

    links: z
      .object({
        displayMode: z.enum(["icon", "url", "icon-username"]),
        items: z.array(
          z.object({
            id: text,
            type: text,
            label: text,
            url: z.string().default(""),
          }),
        ),
      })
      .partial(),

    summary: z.string(),

    experience: z.array(
      z.object({
        id: z.string(),
        company: text,
        role: text,
        location: text,
        startDate: z.string().default(""),
        endDate: z.string().default(""),
        current: z.boolean().optional(),
        summary: text,
        highlights: textList,
      }),
    ),

    education: z.array(
      z.object({
        id: z.string(),
        school: text,
        degree: text,
        field: text,
        startDate: z.string().default(""),
        endDate: z.string().default(""),
        current: z.boolean().optional(),
        summary: text,
      }),
    ),

    projects: z.array(
      z.object({
        id: z.string(),
        name: text,
        role: text,
        link: z.string().default(""),
        linkLabel: text,
        showLinkAsText: z.boolean().default(true),
        summary: text,
        highlights: textList,
        skills: textList,
      }),
    ),

    skills: z.array(
      z.object({
        id: z.string(),
        name: text,
        keywords: textList,
      }),
    ),

    /*
     * The eight typed sections. A resume stored before this model has them flattened into
     * `customSections` instead; `normalizeResumeData` unflattens on read, so both shapes
     * parse and only the typed one is ever written back.
     */
    languages: z.array(
      z.object({
        id: z.string(),
        language: text,
        fluency: resumeFluencySchema,
      }),
    ),

    interests: z.array(
      z.object({
        id: z.string(),
        name: text,
        keywords: textList,
      }),
    ),

    awards: z.array(
      z.object({
        id: z.string(),
        title: text,
        awarder: text,
        date: z.string().default(""),
        website: z.string().optional(),
        description: text,
        showLink: z.boolean().default(false),
      }),
    ),

    certificates: z.array(
      z.object({
        id: z.string(),
        title: text,
        issuer: text,
        date: z.string().default(""),
        website: z.string().optional(),
        referenceId: z.string().optional(),
        description: text,
        showLink: z.boolean().default(false),
      }),
    ),

    publications: z.array(
      z.object({
        id: z.string(),
        title: text,
        publisher: text,
        date: z.string().default(""),
        website: z.string().optional(),
        description: text,
        showLink: z.boolean().default(false),
      }),
    ),

    volunteer: z.array(
      z.object({
        id: z.string(),
        organization: text,
        role: text,
        startDate: z.string().default(""),
        endDate: z.string().default(""),
        current: z.boolean().default(false),
        location: text,
        summary: text,
      }),
    ),

    references: z.array(
      z.object({
        id: z.string(),
        name: text,
        title: text,
        organization: text,
        email: z.string().optional(),
        phone: z.string().optional(),
        relationship: text,
      }),
    ),

    achievements: z.array(
      z.object({
        id: z.string(),
        title: text,
        description: text,
      }),
    ),

    customSections: z.array(
      z.object({
        id: text,
        kind: resumeAdditionalSectionKindSchema,
        title: text,
        editableTitle: z.boolean().optional(),
        items: z
          .array(
            z.object({
              id: text,
              name: text,
              issuer: text,
              date: text,
              link: text,
              referenceId: text,
              description: text,
              details: textList,
            }),
          )
          .default([]),
      }),
    ),

    sections: z.array(
      z.object({
        id: resumeSectionIdSchema,
        label: z.string(),
        visible: z.boolean(),
        order: z.number(),
        column: z.enum(["left", "right"]).optional(),
        customSectionId: z.string().optional(),
      }),
    ),

    customization: z
      .object({
        accentColor: z.string(),
        textColor: z.string(),
        mutedTextColor: z.string(),
        pageBackgroundColor: z.string(),
        sectionBackgroundColor: z.string(),
        borderColor: z.string(),
        sectionHeadingColor: z.string(),
        fontFamily: resumeFontFamilySchema,
        sectionSpacing: z.number(),
        pagePadding: z.number(),
        bodyLineHeight: z.number(),
        headingLineHeight: z.number(),
      })
      .partial(),

    sync: documentSyncStateSchema,
    updatedAt: z.string(),
  })
  .passthrough()
  .partial();

/**
 * An imported file has to say it is a resume. `basics` is the key every resume carries and
 * no other document type does, so `{}` and a cover letter's export are both refused.
 */
const resumeImportSchema = resumeDataInputSchema.required({ basics: true });

/** The read path for storage, sync and the editor. */
export function parseResumeDataInput(value: unknown) {
  const result = resumeDataInputSchema.safeParse(value);

  if (!result.success) {
    return null;
  }

  return normalizeResumeData(result.data as Partial<ResumeData>);
}

/** The read path for a file the user imports. */
export function parseResumeImport(value: unknown) {
  const result = resumeImportSchema.safeParse(value);

  if (!result.success) {
    return null;
  }

  return normalizeResumeData(result.data as Partial<ResumeData>);
}
