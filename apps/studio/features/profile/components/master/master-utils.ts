import type {
  ResumeAward,
  ResumeSection,
  ResumeLanguage,
  ResumeInterest,
  ResumeReference,
  ResumeVolunteer,
  ResumeSkillGroup,
  ResumeAchievement,
  ResumeCertificate,
  ResumeProjectItem,
  ResumePublication,
  ResumeCustomSection,
  ResumeEducationItem,
  ResumeExperienceItem,
} from "@/types/resume";

import { createId } from "@veriworkly/profile-core";

import { fontOptions } from "@/features/documents/constants/fonts";

/*
 * What is left here is the master editor UI: the option lists the selects render, the
 * line-splitting the textareas do, and the empty-item factories the "Add" buttons call.
 *
 * Everything that describes the *profile itself* — the save validator, the save sanitiser,
 * the id normalisers, the URL and email predicates — moved to `@veriworkly/profile-core`,
 * because the server needs exactly those rules and used to carry its own drifting copy of
 * them. They are re-exported below so this module stays the single import site the editor
 * components already use.
 */
export {
  createId,
  ensureUniqueIds,
  normalizeProfileIds,
  isValidAbsoluteUrl,
  normalizeAbsoluteUrl,
  sanitizeMasterProfileForSave,
  validateMasterProfileForSave,
  // Named `isValidEmail` here since the editor was written against that name; it is the
  // strict predicate (a blank string is not a valid address).
  isEmail as isValidEmail,
} from "@veriworkly/profile-core";

export const linkTypes = ["github", "linkedin", "portfolio"] as const;
export const fontFamilies = fontOptions.map((font) => font.value);

export const fluencyOptions: ResumeLanguage["fluency"][] = [
  "elementary",
  "limited",
  "professional",
  "fluent",
  "native",
];

export const sectionLabels: Record<ResumeSection["id"], string> = {
  basics: "Basics",
  links: "Links",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  awards: "Awards",
  publications: "Publications",
  languages: "Languages",
  interests: "Interests",
  volunteer: "Volunteer",
  references: "References",
  achievements: "Achievements",
  custom: "Custom",
};

export function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinLines(values: string[]) {
  return values.join("\n");
}

export function emptyExperience(): ResumeExperienceItem {
  return {
    id: createId("experience"),
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

export function emptyEducation(): ResumeEducationItem {
  return {
    id: createId("education"),
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    current: false,
    summary: "",
  };
}

export function emptyProject(): ResumeProjectItem {
  return {
    id: createId("project"),
    name: "",
    role: "",
    link: "",
    linkLabel: "Link",
    showLinkAsText: true,
    summary: "",
    highlights: [],
    skills: [],
  };
}

export function emptySkill(): ResumeSkillGroup {
  return {
    id: createId("skill"),
    name: "",
    keywords: [],
  };
}

export function emptyLanguage(): ResumeLanguage {
  return {
    id: createId("language"),
    language: "",
    fluency: "professional",
  };
}

export function emptyInterest(): ResumeInterest {
  return {
    id: createId("interest"),
    name: "",
    keywords: [],
  };
}

export function emptyAward(): ResumeAward {
  return {
    id: createId("award"),
    title: "",
    awarder: "",
    date: "",
    website: "",
    description: "",
    showLink: false,
  };
}

export function emptyCertificate(): ResumeCertificate {
  return {
    id: createId("certificate"),
    title: "",
    issuer: "",
    date: "",
    website: "",
    referenceId: "",
    description: "",
    showLink: false,
  };
}

export function emptyPublication(): ResumePublication {
  return {
    id: createId("publication"),
    title: "",
    publisher: "",
    date: "",
    website: "",
    description: "",
    showLink: false,
  };
}

export function emptyVolunteer(): ResumeVolunteer {
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

export function emptyReference(): ResumeReference {
  return {
    id: createId("reference"),
    name: "",
    title: "",
    organization: "",
    email: "",
    phone: "",
    relationship: "",
  };
}

export function emptyAchievement(): ResumeAchievement {
  return {
    id: createId("achievement"),
    title: "",
    description: "",
  };
}

export function emptyCustomSection(): ResumeCustomSection {
  return {
    id: createId("custom"),
    kind: "custom",
    title: "Other",
    items: [],
    editableTitle: true,
  };
}

export function updateItem<T extends { id: string }>(
  items: T[],
  id: string,
  updater: (item: T) => T,
) {
  return items.map((item) => (item.id === id ? updater(item) : item));
}

export function removeItem<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}
