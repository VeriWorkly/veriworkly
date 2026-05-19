export type CountKey = "experience" | "projects" | "skills";

export type MasterSectionNavItem = {
  id: string;
  label: string;
  countKey?: CountKey;
};

export const MASTER_SECTION_NAV: MasterSectionNavItem[] = [
  { id: "profile-basics", label: "Resume basics" },
  { id: "profile-summary-links", label: "Summary and links" },
  { id: "profile-appearance", label: "Appearance" },
  { id: "profile-visibility", label: "Section visibility" },
  { id: "profile-experience", label: "Experience", countKey: "experience" },
  { id: "profile-education", label: "Education" },
  { id: "profile-projects", label: "Projects", countKey: "projects" },
  { id: "profile-skills", label: "Skills", countKey: "skills" },
  { id: "profile-languages", label: "Languages" },
  { id: "profile-interests", label: "Interests" },
  { id: "profile-credentials", label: "Awards, certificates, publications" },
  { id: "profile-volunteer", label: "Volunteer" },
  { id: "profile-references", label: "References" },
  { id: "profile-achievements", label: "Achievements" },
  { id: "profile-custom-sections", label: "Custom sections" },
];
