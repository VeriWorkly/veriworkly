import type {
  ResumeData,
  ResumeAward,
  ResumeAchievement,
  ResumeAdditionalItem,
  ResumeCertificate,
  ResumeCustomSection,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeInterest,
  ResumeLanguage,
  ResumeLinkItem,
  ResumeLinkType,
  ResumeProjectItem,
  ResumePublication,
  ResumeReference,
  ResumeSkillGroup,
  ResumeVolunteer,
} from "@/types/resume";

import { createId } from "@veriworkly/profile-core";

export function createExperienceItem(): ResumeExperienceItem {
  return {
    id: createId("exp"),
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

export function createEducationItem(): ResumeEducationItem {
  return {
    id: createId("edu"),
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    current: false,
    summary: "",
  };
}

export function createProjectItem(): ResumeProjectItem {
  return {
    id: createId("proj"),
    name: "",
    role: "",
    link: "",
    linkLabel: "",
    showLinkAsText: true,
    summary: "",
    highlights: [],
    skills: [],
  };
}

export function createLinkItem(type: ResumeLinkType = "portfolio"): ResumeLinkItem {
  return {
    id: createId("link"),
    type,
    label: "",
    url: "",
  };
}

export function createSkillGroup(): ResumeSkillGroup {
  return {
    id: createId("skills"),
    name: "",
    keywords: [],
  };
}

export function createCustomItem(): ResumeAdditionalItem {
  return {
    id: createId("custom"),
    name: "",
    issuer: "",
    date: "",
    link: "",
    referenceId: "",
    description: "",
    details: [],
  };
}

/**
 * The eight typed optional sections. Rows start genuinely empty, with no placeholder name:
 * `ListEditorControls` falls back to "Certification 1" for an unnamed entry, and a placeholder
 * would risk being exported as if the user had typed it.
 */

function createLanguage(): ResumeLanguage {
  return { id: createId("lang"), language: "", fluency: "professional" };
}

function createInterest(): ResumeInterest {
  return { id: createId("interest"), name: "", keywords: [] };
}

function createAward(): ResumeAward {
  return {
    id: createId("award"),
    title: "",
    awarder: "",
    date: "",
    website: "",
    description: "",
    showLink: true,
  };
}

function createCertificate(): ResumeCertificate {
  return {
    id: createId("cert"),
    title: "",
    issuer: "",
    date: "",
    website: "",
    referenceId: "",
    description: "",
    showLink: true,
  };
}

function createPublication(): ResumePublication {
  return {
    id: createId("pub"),
    title: "",
    publisher: "",
    date: "",
    website: "",
    description: "",
    showLink: true,
  };
}

function createVolunteer(): ResumeVolunteer {
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

function createReference(): ResumeReference {
  return {
    id: createId("ref"),
    name: "",
    title: "",
    organization: "",
    email: "",
    phone: "",
    relationship: "",
  };
}

function createAchievement(): ResumeAchievement {
  return { id: createId("achievement"), title: "", description: "" };
}

export function createCustomSection(): ResumeCustomSection {
  return {
    id: createId("custom"),
    kind: "custom",
    title: "",
    editableTitle: true,
    items: [],
  };
}

/** The eight arrays a section editor can add to, and the item type each one holds. */
export type ResumeTypedSectionKey =
  | "languages"
  | "interests"
  | "awards"
  | "certificates"
  | "publications"
  | "volunteer"
  | "references"
  | "achievements";

export type ResumeTypedSectionItem<K extends ResumeTypedSectionKey> = ResumeData[K][number];

const TYPED_SECTION_FACTORIES = {
  languages: createLanguage,
  interests: createInterest,
  awards: createAward,
  certificates: createCertificate,
  publications: createPublication,
  volunteer: createVolunteer,
  references: createReference,
  achievements: createAchievement,
} as const;

/** One entry point for the store's generic typed-list actions. */
export function createTypedSectionItem<K extends ResumeTypedSectionKey>(
  key: K,
): ResumeTypedSectionItem<K> {
  return TYPED_SECTION_FACTORIES[key]() as ResumeTypedSectionItem<K>;
}
