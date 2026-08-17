import { CURRENT_SCHEMA_VERSION } from "./schema.js";
import type {
  MasterProfileData,
  MasterProfileSection,
  MasterProfileCustomization,
  MasterProfileCustomSection,
} from "./types.js";

export { createId } from "../common/primitives.js";

/**
 * The neutral starting point for a master profile: correct structure, no content.
 */

export const DEFAULT_SECTIONS: MasterProfileSection[] = [
  { id: "basics", label: "Basics", visible: true, order: 0 },
  { id: "links", label: "Links", visible: true, order: 1 },
  { id: "summary", label: "Summary", visible: true, order: 2 },
  { id: "experience", label: "Experience", visible: true, order: 3 },
  { id: "education", label: "Education", visible: true, order: 4 },
  { id: "projects", label: "Projects", visible: true, order: 5 },
  { id: "skills", label: "Skills", visible: true, order: 6 },
  { id: "certifications", label: "Certifications", visible: true, order: 7 },
  { id: "awards", label: "Awards", visible: true, order: 8 },
  { id: "publications", label: "Publications", visible: true, order: 9 },
  { id: "languages", label: "Languages", visible: true, order: 10 },
  { id: "interests", label: "Interests", visible: true, order: 11 },
  { id: "volunteer", label: "Volunteer", visible: true, order: 12 },
  { id: "references", label: "References", visible: true, order: 13 },
  { id: "achievements", label: "Achievements", visible: true, order: 14 },
  { id: "custom", label: "Custom", visible: true, order: 15, customSectionId: "custom-default" },
];

export const DEFAULT_CUSTOM_SECTIONS: MasterProfileCustomSection[] = [
  {
    id: "custom-default",
    kind: "custom",
    title: "Custom Section",
    editableTitle: true,
    items: [],
  },
];

export const DEFAULT_CUSTOMIZATION: MasterProfileCustomization = {
  accentColor: "#2563eb",
  textColor: "#0f172a",
  mutedTextColor: "#475569",
  pageBackgroundColor: "#ffffff",
  sectionBackgroundColor: "#ffffff",
  borderColor: "#cbd5e1",
  sectionHeadingColor: "#334155",
  fontFamily: "geist",
  sectionSpacing: 28,
  pagePadding: 32,
  bodyLineHeight: 1.5,
  headingLineHeight: 1.2,
};

export const DEFAULT_TEMPLATE_ID = "executive-clarity";

/**
 * A structurally complete, content-free master profile.
 */
export function createEmptyMasterProfile(): MasterProfileData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateId: DEFAULT_TEMPLATE_ID,
    basics: {
      fullName: "",
      role: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      linkEmail: false,
      linkPhone: false,
      linkLocation: false,
    },
    links: { displayMode: "icon-username", items: [] },
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    interests: [],
    awards: [],
    certificates: [],
    publications: [],
    volunteer: [],
    references: [],
    achievements: [],
    customSections: structuredClone(DEFAULT_CUSTOM_SECTIONS),
    sections: structuredClone(DEFAULT_SECTIONS),
    customization: { ...DEFAULT_CUSTOMIZATION },
    updatedAt: new Date().toISOString(),
  };
}
