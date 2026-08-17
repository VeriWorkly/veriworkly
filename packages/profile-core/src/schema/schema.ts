import { z } from "zod";

import {
  phoneSchema,
  yearDateSchema,
  monthDateSchema,
  urlOrEmptySchema,
  emailOrEmptySchema,
} from "../common/primitives.js";

/**
 * The master profile schema. There is exactly one of these in the repo.
 *
 * It used to be written out by hand four times — the studio's storage schema, the server's
 * request validator, the studio's UI-rules validator, and the import pipeline's shell
 * builder — and the copies had already drifted apart. Every defect the remediation plan
 * catalogued was downstream of that duplication.
 *
 * Two decisions this schema encodes, both settled before it was extracted:
 *
 *  - **Length caps come from the server.** The studio's copy had none, but the server is
 *    what gates persistence, so its caps are the ones that were ever real. A client that
 *    accepts a 9000-character summary only buys the user a 400.
 *
 *  - **Unknown keys are stripped, never rejected.** DEPLOY ORDER: when adding a field,
 *    deploy the server first. Both sides strip, so a client-first deploy degrades to "the
 *    new field is ignored until the server ships" instead of a hard 400 on every save.
 *    `.strict()` on the server against `.passthrough()` on the client was the worst of both:
 *    one stray key (the import pipeline wrote a `sync` object) made every later save fail
 *    permanently.
 *
 * Optional-array defaults are kept from the studio's copy: a payload that omits `awards`
 * gets `[]` rather than a validation error. An incomplete profile must remain storable.
 */

const idSchema = z.string().trim().min(1).max(128);

export const CURRENT_SCHEMA_VERSION = 2;

export const sectionIdSchema = z.enum([
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

export const linkTypeSchema = z.enum([
  "github",
  "linkedin",
  "dribbble",
  "twitter",
  "portfolio",
  "behance",
  "medium",
  "youtube",
  "custom",
]);

export const customSectionKindSchema = z.enum([
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

export const fluencySchema = z.enum(["elementary", "limited", "professional", "fluent", "native"]);

export const basicsSchema = z.object({
  fullName: z.string().max(120),
  role: z.string().max(120),
  headline: z.string().max(250),
  email: emailOrEmptySchema,
  phone: phoneSchema,
  location: z.string().max(120),
  linkEmail: z.boolean(),
  linkPhone: z.boolean(),
  linkLocation: z.boolean(),
});

export const linkItemSchema = z.object({
  id: idSchema,
  type: linkTypeSchema,
  label: z.string().max(80),
  url: urlOrEmptySchema,
});

export const linksSchema = z.object({
  displayMode: z.enum(["icon", "url", "icon-username"]),
  items: z.array(linkItemSchema).max(50),
});

export const experienceItemSchema = z.object({
  id: idSchema,
  company: z.string().max(160),
  role: z.string().max(160),
  location: z.string().max(120),
  startDate: monthDateSchema,
  endDate: monthDateSchema,
  current: z.boolean(),
  summary: z.string().max(5000),
  highlights: z.array(z.string().max(400)).max(50),
});

export const educationItemSchema = z.object({
  id: idSchema,
  school: z.string().max(160),
  degree: z.string().max(160),
  field: z.string().max(160),
  startDate: yearDateSchema,
  endDate: yearDateSchema,
  current: z.boolean(),
  summary: z.string().max(5000),
});

export const projectItemSchema = z.object({
  id: idSchema,
  name: z.string().max(160),
  role: z.string().max(160),
  link: urlOrEmptySchema,
  linkLabel: z.string().max(80).default("Link"),
  showLinkAsText: z.boolean().default(true),
  summary: z.string().max(5000),
  highlights: z.array(z.string().max(400)).max(50),
  skills: z.array(z.string().max(80)).max(100).default([]),
});

export const skillGroupSchema = z.object({
  id: idSchema,
  name: z.string().max(120),
  keywords: z.array(z.string().max(80)).max(100),
});

export const languageSchema = z.object({
  id: idSchema,
  language: z.string().max(80),
  fluency: fluencySchema,
});

export const interestSchema = z.object({
  id: idSchema,
  name: z.string().max(120),
  keywords: z.array(z.string().max(80)).max(100),
});

export const awardSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  awarder: z.string().max(200),
  date: monthDateSchema,
  website: urlOrEmptySchema.optional(),
  description: z.string().max(5000),
  showLink: z.boolean(),
});

export const certificateSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  issuer: z.string().max(200),
  date: monthDateSchema,
  website: urlOrEmptySchema.optional(),
  /**
   * The credential id printed on the certificate. Optional, and the only typed field that
   * exists because of the flattened model rather than in spite of it: the resume editor has
   * always collected it (into the shared item's `referenceId` slot) and templates have
   * always rendered it, so unflattening without somewhere to put it would have deleted it
   * from every stored resume. See `legacy-sections.ts`.
   */
  referenceId: z.string().max(200).optional(),
  description: z.string().max(5000),
  showLink: z.boolean(),
});

export const publicationSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  publisher: z.string().max(200),
  date: monthDateSchema,
  website: urlOrEmptySchema.optional(),
  description: z.string().max(5000),
  showLink: z.boolean(),
});

export const volunteerSchema = z.object({
  id: idSchema,
  organization: z.string().max(200),
  role: z.string().max(160),
  startDate: monthDateSchema,
  endDate: monthDateSchema,
  current: z.boolean(),
  location: z.string().max(120),
  summary: z.string().max(5000),
});

export const referenceSchema = z.object({
  id: idSchema,
  name: z.string().max(160),
  title: z.string().max(160),
  organization: z.string().max(200),
  email: emailOrEmptySchema.optional(),
  phone: phoneSchema.optional(),
  relationship: z.string().max(200),
});

export const achievementSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  description: z.string().max(5000),
});

/**
 * The item shape a genuinely custom section uses. It is loose on purpose: a section the
 * user invented has no schema of its own, so it gets a generic record with a name, a link,
 * a date, and free text.
 */
export const customItemSchema = z.object({
  id: idSchema,
  name: z.string().max(200),
  issuer: z.string().max(200),
  date: z.string().max(40),
  link: z.string().max(2048),
  referenceId: z.string().max(200),
  description: z.string().max(5000),
  details: z.array(z.string().max(500)).max(50),
});

export const customSectionSchema = z.object({
  id: idSchema,
  kind: customSectionKindSchema,
  title: z.string().max(120),
  items: z.array(customItemSchema).max(200),
  editableTitle: z.boolean().optional(),
});

export const sectionSchema = z.object({
  id: sectionIdSchema,
  label: z.string().max(80),
  visible: z.boolean(),
  order: z.number().int().min(0).max(1000),
  /**
   * Which custom section this entry orders and toggles. Set only when `id` is "custom".
   */
  customSectionId: z.string().max(128).optional(),
});

/**
 * The four numeric ranges are the server's. They gate persistence, so the studio's wider
 * ones only ever bought the user a slider they could drag into a 400.
 */
export const customizationSchema = z.object({
  accentColor: z.string().max(32),
  textColor: z.string().max(32),
  mutedTextColor: z.string().max(32),
  pageBackgroundColor: z.string().max(32),
  sectionBackgroundColor: z.string().max(32),
  borderColor: z.string().max(32),
  sectionHeadingColor: z.string().max(32),
  fontFamily: z.string().trim().min(1).max(32),
  sectionSpacing: z.number().min(0).max(120),
  pagePadding: z.number().min(0).max(120),
  bodyLineHeight: z.number().min(1).max(3),
  headingLineHeight: z.number().min(1).max(3),
});

const masterProfileSchemaBase = z.object({
  schemaVersion: z.number().int().positive().default(CURRENT_SCHEMA_VERSION),
  templateId: z.string().trim().min(1).max(64),
  basics: basicsSchema,
  links: linksSchema,
  summary: z.string().max(8000),
  experience: z.array(experienceItemSchema).max(200).default([]),
  education: z.array(educationItemSchema).max(200).default([]),
  projects: z.array(projectItemSchema).max(200).default([]),
  skills: z.array(skillGroupSchema).max(200).default([]),
  languages: z.array(languageSchema).max(200).default([]),
  interests: z.array(interestSchema).max(200).default([]),
  awards: z.array(awardSchema).max(200).default([]),
  certificates: z.array(certificateSchema).max(200).default([]),
  publications: z.array(publicationSchema).max(200).default([]),
  volunteer: z.array(volunteerSchema).max(200).default([]),
  references: z.array(referenceSchema).max(200).default([]),
  achievements: z.array(achievementSchema).max(200).default([]),
  customSections: z.array(customSectionSchema).max(200).default([]),
  sections: z.array(sectionSchema).max(200).default([]),
  customization: customizationSchema,
  updatedAt: z.string().datetime().optional(),
});

export const masterProfileSchema = masterProfileSchemaBase.strip();

/**
 * Per-field schemas, exported so a corrupt profile can be validated one field at a time and
 * the parts that still parse kept. Whole-object parsing is all-or-nothing, and "all" means
 * the user loses their work history over one malformed award.
 */
export const masterProfileFieldSchemas = masterProfileSchemaBase.shape;
