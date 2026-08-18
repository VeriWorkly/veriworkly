import type {
  ResumeData,
  ResumeAward,
  ResumeAchievement,
  ResumeAdditionalItem,
  ResumeAdditionalSectionKind,
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

function uniqueId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createExperienceItem(): ResumeExperienceItem {
  return {
    id: uniqueId("exp"),
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
    id: uniqueId("edu"),
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
    id: uniqueId("proj"),
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

export function createLinkItem(type: ResumeLinkType = "portfolio"): ResumeLinkItem {
  return {
    id: uniqueId("link"),
    type,
    label: "",
    url: "",
  };
}

export function createSkillGroup(): ResumeSkillGroup {
  return {
    id: uniqueId("skills"),
    name: "New Skills",
    keywords: [],
  };
}

export function createAdditionalItem(kind: ResumeAdditionalSectionKind): ResumeAdditionalItem {
  const base = {
    id: uniqueId(kind),
    issuer: "",
    date: "",
    link: "",
    referenceId: "",
    description: "",
    details: [],
  };

  if (kind === "certifications") {
    return {
      ...base,
      name: "New Certification",
    };
  }

  if (kind === "awards") {
    return {
      ...base,
      name: "New Award",
    };
  }

  if (kind === "publications") {
    return {
      ...base,
      name: "New Publication",
    };
  }

  if (kind === "languages") {
    return {
      ...base,
      name: "Language",
      referenceId: "Proficiency",
    };
  }

  if (kind === "interests") {
    return {
      ...base,
      name: "Interest",
    };
  }

  if (kind === "volunteer") {
    return {
      ...base,
      name: "Organization",
      issuer: "Role",
    };
  }

  if (kind === "references") {
    return {
      ...base,
      name: "Reference Name",
      issuer: "Title",
      referenceId: "Relationship",
    };
  }

  if (kind === "achievements") {
    return {
      ...base,
      name: "Achievement",
    };
  }

  return {
    ...base,
    name: "Custom Item",
  };
}

/**
 * The eight typed optional sections.
 *
 * These used to come out of `createAdditionalItem`, which returned one flat shape for every
 * section and pre-filled `name` with a placeholder ("New Certification", "Reference Name")
 * because the list control had no other label to show. The typed factories return genuinely
 * empty rows: `ListEditorControls` falls back to "Certification 1" for an unnamed entry, so
 * the placeholder only ever risked being exported as if the user had typed it.
 */

export function createLanguage(): ResumeLanguage {
  return { id: uniqueId("lang"), language: "", fluency: "professional" };
}

export function createInterest(): ResumeInterest {
  return { id: uniqueId("interest"), name: "", keywords: [] };
}

export function createAward(): ResumeAward {
  return {
    id: uniqueId("award"),
    title: "",
    awarder: "",
    date: "",
    website: "",
    description: "",
    showLink: true,
  };
}

export function createCertificate(): ResumeCertificate {
  return {
    id: uniqueId("cert"),
    title: "",
    issuer: "",
    date: "",
    website: "",
    referenceId: "",
    description: "",
    showLink: true,
  };
}

export function createPublication(): ResumePublication {
  return {
    id: uniqueId("pub"),
    title: "",
    publisher: "",
    date: "",
    website: "",
    description: "",
    showLink: true,
  };
}

export function createVolunteer(): ResumeVolunteer {
  return {
    id: uniqueId("volunteer"),
    organization: "",
    role: "",
    startDate: "",
    endDate: "",
    current: false,
    location: "",
    summary: "",
  };
}

export function createReference(): ResumeReference {
  return {
    id: uniqueId("ref"),
    name: "",
    title: "",
    organization: "",
    email: "",
    phone: "",
    relationship: "",
  };
}

export function createAchievement(): ResumeAchievement {
  return { id: uniqueId("achievement"), title: "", description: "" };
}

export function createCustomSection(): ResumeCustomSection {
  return {
    id: uniqueId("custom"),
    kind: "custom",
    title: "Custom Section",
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
