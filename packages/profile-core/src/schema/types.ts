import type { z } from "zod";

import type {
  basicsSchema,
  linksSchema,
  linkItemSchema,
  linkTypeSchema,
  awardSchema,
  sectionSchema,
  languageSchema,
  interestSchema,
  fluencySchema,
  sectionIdSchema,
  referenceSchema,
  volunteerSchema,
  skillGroupSchema,
  achievementSchema,
  certificateSchema,
  customItemSchema,
  projectItemSchema,
  publicationSchema,
  customizationSchema,
  educationItemSchema,
  experienceItemSchema,
  customSectionSchema,
  masterProfileSchema,
  customSectionKindSchema,
} from "./schema.js";

/*
 * Inferred, not hand-written. A hand-written interface beside a zod schema is a fifth copy
 * of the same definition waiting to drift from the other four — which is the exact failure
 * this package exists to end.
 */

export type MasterProfileSectionId = z.infer<typeof sectionIdSchema>;
export type MasterProfileLinkType = z.infer<typeof linkTypeSchema>;
export type MasterProfileFluency = z.infer<typeof fluencySchema>;
export type MasterProfileCustomSectionKind = z.infer<typeof customSectionKindSchema>;

export type MasterProfileBasics = z.infer<typeof basicsSchema>;
export type MasterProfileLinkItem = z.infer<typeof linkItemSchema>;
export type MasterProfileLinks = z.infer<typeof linksSchema>;
export type MasterProfileSection = z.infer<typeof sectionSchema>;
export type MasterProfileExperienceItem = z.infer<typeof experienceItemSchema>;
export type MasterProfileEducationItem = z.infer<typeof educationItemSchema>;
export type MasterProfileProjectItem = z.infer<typeof projectItemSchema>;
export type MasterProfileSkillGroup = z.infer<typeof skillGroupSchema>;
export type MasterProfileLanguage = z.infer<typeof languageSchema>;
export type MasterProfileInterest = z.infer<typeof interestSchema>;
export type MasterProfileAward = z.infer<typeof awardSchema>;
export type MasterProfileCertificate = z.infer<typeof certificateSchema>;
export type MasterProfilePublication = z.infer<typeof publicationSchema>;
export type MasterProfileVolunteer = z.infer<typeof volunteerSchema>;
export type MasterProfileReference = z.infer<typeof referenceSchema>;
export type MasterProfileAchievement = z.infer<typeof achievementSchema>;
export type MasterProfileCustomItem = z.infer<typeof customItemSchema>;
export type MasterProfileCustomSection = z.infer<typeof customSectionSchema>;
export type MasterProfileCustomization = z.infer<typeof customizationSchema>;

/**
 * The canonical user data pool. Documents are seeded from it once, at creation, and never
 * write back — see the remediation plan's fork-on-create rule.
 */
export type MasterProfileData = z.infer<typeof masterProfileSchema>;

/** Historical alias. Several studio call sites still use this name. */
export type MasterProfile = MasterProfileData;

/**
 * The shape a caller supplies. Every array carries a schema-level default, so a partially
 * filled object is a legitimate input — normalisation fills the rest in.
 */
export type MasterProfileInput = z.input<typeof masterProfileSchema>;
