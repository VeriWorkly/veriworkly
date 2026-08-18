import type {
  MasterProfileAward,
  MasterProfileInterest,
  MasterProfileLanguage,
  MasterProfileReference,
  MasterProfileVolunteer,
  MasterProfileAchievement,
  MasterProfileCertificate,
  MasterProfilePublication,
} from "@veriworkly/profile-core";

import type { DocumentSyncState } from "@/types";
import type { SyncStatus } from "@/features/documents/services/sync-engine";
import type {
  DocumentLinkItem,
  DocumentLinkType,
  DocumentLinkDisplayMode,
} from "@/features/documents/core/link-types";

export type ResumeSectionId =
  | "basics"
  | "links"
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "awards"
  | "publications"
  | "languages"
  | "interests"
  | "volunteer"
  | "references"
  | "achievements"
  | "custom";

export interface ResumeSection {
  id: ResumeSectionId;
  label: string;
  visible: boolean;
  order: number;
  column?: "left" | "right";
  /**
   * Which custom section this entry orders and toggles. Set only when `id` is "custom".
   *
   * `id` is a closed enum with a single "custom" member, so it cannot tell two custom
   * sections apart. Every consumer that looked one up by id or kind found the first and
   * silently dropped the rest, which is why a resume could only ever print one.
   */
  customSectionId?: string;
}

export interface ResumeBasics {
  fullName: string;
  role: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkEmail: boolean;
  linkPhone: boolean;
  linkLocation: boolean;
}

/*
 * Aliases, not declarations. Link data is shared by every document type — the cover letter
 * imported these names verbatim — so the shapes are declared neutrally in
 * `features/documents/core/link-types.ts` and re-exported here under their historical
 * names, which keeps the resume's several dozen import sites untouched.
 */
export type ResumeLinkType = DocumentLinkType;
export type ResumeLinkDisplayMode = DocumentLinkDisplayMode;
export type ResumeLinkItem = DocumentLinkItem;

export interface ResumeLinks {
  displayMode: ResumeLinkDisplayMode;
  items: ResumeLinkItem[];
}

export interface ResumeExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  summary: string;
  highlights: string[];
}

export interface ResumeEducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
  summary: string;
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  role: string;
  link: string;
  linkLabel: string;
  showLinkAsText: boolean;
  summary: string;
  highlights: string[];
  skills: string[];
}

export interface ResumeSkillGroup {
  id: string;
  name: string;
  keywords: string[];
}

/*
 * Aliases, not declarations — same reason as the link types above. These eight sections are
 * defined once, by the zod schema in `@veriworkly/profile-core`, and a resume carries the
 * identical shapes: a certificate does not become a different thing because it is printed
 * on a resume rather than stored on a profile. Redeclaring them here is how the two models
 * drifted apart in the first place.
 */
export type ResumeLanguage = MasterProfileLanguage;
export type ResumeInterest = MasterProfileInterest;
export type ResumeAward = MasterProfileAward;
export type ResumeCertificate = MasterProfileCertificate;
export type ResumePublication = MasterProfilePublication;
export type ResumeVolunteer = MasterProfileVolunteer;
export type ResumeReference = MasterProfileReference;
export type ResumeAchievement = MasterProfileAchievement;

export type ResumeAdditionalSectionKind =
  | "certifications"
  | "awards"
  | "publications"
  | "languages"
  | "interests"
  | "volunteer"
  | "references"
  | "achievements"
  | "custom";

export interface ResumeAdditionalItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  link: string;
  referenceId: string;
  description: string;
  details: string[];
}

/**
 * A section the user invented, with a generic item shape because it has no schema of its
 * own.
 *
 * `kind` keeps the wider union only so a document stored before the typed model still
 * parses; everything written from here on has `kind: "custom"`, and the normaliser folds
 * anything else back into the typed arrays above. See `unflattenLegacySections` in
 * `@veriworkly/profile-core`.
 */
export interface ResumeCustomSection {
  id: string;
  kind: ResumeAdditionalSectionKind;
  title: string;
  items: ResumeAdditionalItem[];
  editableTitle?: boolean;
}

export interface ResumeCustomization {
  fontFamily: string;
  theme?: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  pageBackgroundColor: string;
  sectionBackgroundColor: string;
  borderColor: string;
  sectionHeadingColor: string;
  sectionSpacing: number;
  pagePadding: number;
  bodyLineHeight: number;
  headingLineHeight: number;
}

export type ResumeSyncStatus = SyncStatus;

export type ResumeSyncState = DocumentSyncState;

export interface ResumeData {
  id: string;
  templateId: string;
  title?: string;
  basics: ResumeBasics;
  links: ResumeLinks;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  skills: ResumeSkillGroup[];
  /*
   * The same eight typed arrays the master profile has. A resume used to carry none of
   * them: every optional section was flattened into `customSections`, which meant the
   * master -> resume hand-off could only ever lose data — a reference's phone number
   * arrived in a field called `date` and a volunteer's dates arrived as one display string.
   */
  languages: ResumeLanguage[];
  interests: ResumeInterest[];
  awards: ResumeAward[];
  certificates: ResumeCertificate[];
  publications: ResumePublication[];
  volunteer: ResumeVolunteer[];
  references: ResumeReference[];
  achievements: ResumeAchievement[];
  /** Only sections the user invented. The eight typed ones above are not in here. */
  customSections: ResumeCustomSection[];
  sections: ResumeSection[];
  customization: ResumeCustomization;
  sync: ResumeSyncState;
  updatedAt: string;
}

/*
 * Re-exported, not redeclared. The master profile is defined once, in
 * `@veriworkly/profile-core`, and its type is inferred from that schema — a hand-written
 * interface here would be a second definition free to drift from the schema the server
 * validates against, which is precisely the failure the package was extracted to end.
 *
 * `ResumeData` above stays local: a resume is a document, forked from the profile at
 * creation and independent of it thereafter. Its member types are the profile's, though —
 * see the alias blocks — so the two can no longer disagree about what a certificate is.
 */
export type { MasterProfileData, MasterProfile } from "@veriworkly/profile-core";
