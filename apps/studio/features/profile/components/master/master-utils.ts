import type {
  MasterProfileData,
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

import {
  createId,
  fluencySchema,
  sanitizeMasterProfileForSave,
  validateMasterProfileForSave,
} from "@veriworkly/profile-core";

import { fontOptions } from "@/features/documents/constants/fonts";
import { normalizeMonthDate } from "@/features/resume/utils/normalize-data";

/*
 * The master editor UI: the option lists the selects render and the empty-item factories the
 * "Add" buttons call. The rules that describe the profile itself live in
 * `@veriworkly/profile-core`, which the server uses too, and are re-exported here as the
 * editor components' single import site.
 */
export {
  createId,
  normalizeProfileIds,
  isValidAbsoluteUrl,
  sanitizeMasterProfileForSave,
  validateMasterProfileForSave,
  // Named `isValidEmail` here since the editor was written against that name; it is the
  // strict predicate (a blank string is not a valid address).
  isEmail as isValidEmail,
} from "@veriworkly/profile-core";

export const linkTypes = ["github", "linkedin", "portfolio"] as const;
export const fontFamilies = fontOptions.map((font) => font.value);

export const fluencyOptions: readonly ResumeLanguage["fluency"][] = fluencySchema.options;

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
    linkLabel: "",
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

/**
 * The Master Profile's GitHub / LinkedIn / Portfolio fields edit the first link of that
 * type: typing updates it (or adds one), clearing the field removes it.
 */
export function setLinkByType(
  links: MasterProfileData["links"],
  type: MasterProfileData["links"]["items"][number]["type"],
  url: string,
): MasterProfileData["links"] {
  const index = links.items.findIndex((item) => item.type === type);

  if (!url.trim()) {
    return index === -1 ? links : { ...links, items: links.items.filter((_, i) => i !== index) };
  }

  if (index === -1) {
    return { ...links, items: [...links.items, { id: createId("link"), type, label: "", url }] };
  }

  return {
    ...links,
    items: links.items.map((item, i) => (i === index ? { ...item, url } : item)),
  };
}

/** Identifies a visibility row: every custom section shares the id "custom". */
export function sectionRowKey(section: Pick<ResumeSection, "id" | "customSectionId">) {
  return section.customSectionId ? `${section.id}:${section.customSectionId}` : section.id;
}

/**
 * One "custom" visibility row per custom section, matched on `customSectionId`, the way the
 * resume normalises its own sections. Rows for removed sections and duplicate rows are
 * dropped, a row without `customSectionId` (older profiles) is claimed by the first custom
 * section, and a section without a row gets a visible one at the end. Returns `profile`
 * itself when nothing needed fixing, so an already-consistent profile never looks edited.
 */
export function withCustomSectionRows(profile: MasterProfileData): MasterProfileData {
  const customIds = new Set(profile.customSections.map((section) => section.id));
  const firstCustomId = profile.customSections[0]?.id;
  const claimed = new Set<string>();
  let changed = false;

  const kept = profile.sections.flatMap((section) => {
    if (section.id !== "custom") return [section];

    const target = section.customSectionId
      ? customIds.has(section.customSectionId)
        ? section.customSectionId
        : undefined
      : firstCustomId;

    if (!target || claimed.has(target)) {
      changed = true;
      return [];
    }

    claimed.add(target);

    if (target === section.customSectionId) return [section];

    changed = true;
    return [{ ...section, customSectionId: target }];
  });

  let order = Math.max(0, ...profile.sections.map((section) => section.order));

  const added = profile.customSections
    .filter((section) => !claimed.has(section.id))
    .map((section) => ({
      id: "custom" as const,
      label: section.title || "Custom",
      visible: true,
      order: (order += 1),
      customSectionId: section.id,
    }));

  if (!changed && added.length === 0) return profile;

  return { ...profile, sections: [...kept, ...added] };
}

const ONGOING = /^(present|current|now)$/i;

/**
 * A hand-typed month read into `YYYY-MM`. "Present" is only an end date: anywhere else it is
 * kept as typed, so the save refuses it with the date's own message instead of blanking it.
 */
function readMonthDate(value: string) {
  return ONGOING.test(value.trim()) ? value : normalizeMonthDate(value);
}

/** "Present" typed as an end date means the entry is current, as the editor's checkbox says. */
function withMonthDates<T extends { startDate: string; endDate: string; current: boolean }>(
  item: T,
): T {
  const current = item.current || ONGOING.test(item.endDate.trim());

  return {
    ...item,
    current,
    startDate: readMonthDate(item.startDate),
    endDate: current ? "" : readMonthDate(item.endDate),
  };
}

/**
 * The profile as the server will store it, or the reasons it cannot be. Dates are free text
 * in the editor, so the common hand-typed month forms ("Mar 2022", "03/2022") are read into
 * `YYYY-MM` first instead of being refused. Both the guided and the JSON editor save through
 * this, so neither stores a profile the other would refuse.
 */
export function prepareMasterProfileForSave(
  profile: MasterProfileData,
): { ok: true; profile: MasterProfileData } | { ok: false; issues: string[] } {
  const sanitized = sanitizeMasterProfileForSave({
    ...profile,
    experience: profile.experience.map(withMonthDates),
    volunteer: profile.volunteer.map(withMonthDates),
    awards: profile.awards.map((item) => ({ ...item, date: readMonthDate(item.date) })),
    certificates: profile.certificates.map((item) => ({ ...item, date: readMonthDate(item.date) })),
    publications: profile.publications.map((item) => ({ ...item, date: readMonthDate(item.date) })),
  });
  const validation = validateMasterProfileForSave(sanitized);

  return validation.ok
    ? { ok: true, profile: sanitized }
    : { ok: false, issues: validation.issues.length > 0 ? validation.issues : ["Check fields."] };
}

/**
 * What the editor holds once a save returns. A profile that arrives while the editor still
 * holds exactly what was submitted replaces it; text typed while the save ran is kept.
 */
export function rebaseAfterSave(
  current: MasterProfileData,
  submitted: MasterProfileData | null,
  incoming: MasterProfileData,
): MasterProfileData {
  if (submitted && current !== submitted) return current;

  return incoming;
}

/**
 * Whether a click would take the user to another studio page in this tab: a plain left click
 * on a same-origin link to another page. New tabs, downloads, other sites and a jump within this
 * page (a skip link) leave the editor where it is.
 */
export function isInAppNavigation(
  event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">,
  anchor: Pick<HTMLAnchorElement, "href" | "target"> & { hasAttribute(name: string): boolean },
  here: Pick<Location, "origin" | "pathname" | "search">,
) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) {
    return false;
  }

  try {
    const url = new URL(anchor.href, here.origin);

    return (
      url.origin === here.origin && (url.pathname !== here.pathname || url.search !== here.search)
    );
  } catch {
    return false;
  }
}
