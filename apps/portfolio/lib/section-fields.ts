import type { PortfolioSectionType } from "@/lib/portfolio";

/**
 * What the portfolio editor lets a user fill in, per section type.
 *
 * Before this existed, `SectionEditor` rendered one fixed form for every
 * section — title, year, summary, and a project cover — while the templates
 * read 28 distinct item fields. A user could not set their employer, job
 * title, school, degree, credential issuer, dates, skills, keywords, or
 * language proficiency anywhere in the product, so those parts of every
 * template were unreachable and rendered blank on published portfolios.
 *
 * This map is the single source of truth for the editor form. Templates read
 * the same keys (via the normalizing accessors in `template-library/types.ts`),
 * so adding a field here makes it editable *and* published with no other
 * change.
 *
 * Keys are chosen to match what the templates already read. Where a template
 * historically accepted more than one name for the same idea (`description`
 * vs `summary`, `issuer` vs `organization`), the accessors resolve both and
 * the editor writes the canonical one listed here.
 */
export type SectionFieldType = "text" | "textarea" | "date" | "list" | "lines" | "checkbox";

export interface SectionField {
  key: string;
  label: string;
  type: SectionFieldType;
  placeholder?: string;
  /** Renders side-by-side with the next field on wide screens. */
  half?: boolean;
  help?: string;
}

/** Fields every item gets, appended after the per-type fields below. */
const PROSE: SectionField = {
  key: "summary",
  label: "Description",
  type: "textarea",
  placeholder: "What it was, what you did, and what came of it.",
};

const LINK: SectionField = {
  key: "link",
  label: "Link",
  type: "text",
  placeholder: "https://",
};

const DATE_RANGE: SectionField[] = [
  { key: "startDate", label: "Start date", type: "date", placeholder: "2023-01", half: true },
  { key: "endDate", label: "End date", type: "date", placeholder: "2025-06", half: true },
  { key: "current", label: "I'm still here", type: "checkbox" },
];

const HIGHLIGHTS: SectionField = {
  key: "highlights",
  label: "Highlights",
  type: "lines",
  placeholder: "One per line — the specific things you did or shipped.",
  help: "One per line.",
};

/**
 * Credential-shaped sections (certifications, awards, publications, patents,
 * achievements, volunteer) all share the same shape: what it is, who issued
 * it, when, and a link.
 */
function credentialFields(issuerLabel: string, issuerPlaceholder: string): SectionField[] {
  return [
    { key: "title", label: "Title", type: "text" },
    { key: "issuer", label: issuerLabel, type: "text", placeholder: issuerPlaceholder, half: true },
    { key: "date", label: "Date", type: "date", placeholder: "2025", half: true },
    PROSE,
    LINK,
  ];
}

export const sectionFields: Record<PortfolioSectionType, SectionField[]> = {
  projects: [
    { key: "title", label: "Project name", type: "text" },
    { key: "role", label: "Your role", type: "text", placeholder: "Lead engineer", half: true },
    { key: "year", label: "Year", type: "date", placeholder: "2025", half: true },
    PROSE,
    HIGHLIGHTS,
    {
      key: "skills",
      label: "Tech / tags",
      type: "list",
      placeholder: "TypeScript, Postgres, WebGL",
      help: "Comma separated.",
    },
    LINK,
  ],

  experience: [
    { key: "role", label: "Job title", type: "text", placeholder: "Senior Engineer" },
    { key: "company", label: "Company", type: "text", placeholder: "Acme Inc.", half: true },
    { key: "location", label: "Location", type: "text", placeholder: "Remote", half: true },
    ...DATE_RANGE,
    PROSE,
    HIGHLIGHTS,
  ],

  education: [
    { key: "school", label: "School", type: "text", placeholder: "University of ..." },
    { key: "degree", label: "Degree", type: "text", placeholder: "BSc", half: true },
    { key: "field", label: "Field of study", type: "text", placeholder: "Physics", half: true },
    ...DATE_RANGE,
    PROSE,
  ],

  services: [
    { key: "title", label: "Service", type: "text" },
    PROSE,
    {
      key: "details",
      label: "What's included",
      type: "lines",
      placeholder: "One per line.",
      help: "One per line.",
    },
  ],

  skills: [
    { key: "title", label: "Group name", type: "text", placeholder: "Languages" },
    {
      key: "keywords",
      label: "Skills",
      type: "list",
      placeholder: "TypeScript, Go, Rust",
      help: "Comma separated. These render as individual tags.",
    },
    PROSE,
  ],

  writing: [
    { key: "title", label: "Title", type: "text" },
    { key: "date", label: "Published", type: "date", placeholder: "2025-06", half: true },
    { key: "issuer", label: "Publication", type: "text", placeholder: "Where it ran", half: true },
    PROSE,
    LINK,
  ],

  testimonials: [
    { key: "title", label: "Who said it", type: "text", placeholder: "Jane Doe" },
    {
      key: "issuer",
      label: "Their role / company",
      type: "text",
      placeholder: "CTO, Acme Inc.",
      half: true,
    },
    {
      key: "rating",
      label: "Rating (1–5)",
      type: "text",
      placeholder: "5",
      half: true,
      help: "Optional. Leave blank to show no stars.",
    },
    { ...PROSE, label: "Quote", placeholder: "What they said about working with you." },
  ],

  awards: credentialFields("Awarded by", "Organization"),
  certifications: credentialFields("Issued by", "Issuing body"),
  publications: credentialFields("Published in", "Journal or publisher"),
  patents: credentialFields("Patent office", "e.g. USPTO"),
  achievements: credentialFields("Recognized by", "Organization"),
  // The import puts the organization in `title` and the role in `issuer`, and the templates show
  // `title` as the heading, so the labels follow that rather than the credential shape.
  volunteer: [
    { key: "title", label: "Organization", type: "text", placeholder: "Where you volunteered" },
    { key: "issuer", label: "Your role", type: "text", placeholder: "Mentor", half: true },
    { key: "date", label: "Date", type: "date", placeholder: "2025", half: true },
    PROSE,
    LINK,
  ],

  languages: [
    { key: "title", label: "Language", type: "text", placeholder: "Spanish" },
    {
      key: "level",
      label: "Proficiency",
      type: "text",
      placeholder: "Native / Fluent / Professional / Limited / Elementary",
      help: "Drives the proficiency meter. Native and Fluent fill all five bars.",
    },
    PROSE,
  ],

  interests: [{ key: "title", label: "Interest", type: "text" }, PROSE],

  testScores: [
    { key: "title", label: "Test", type: "text", placeholder: "GRE" },
    {
      key: "score",
      label: "Score",
      type: "text",
      placeholder: "picked up as a gauge, e.g. 336/340 or 98",
      half: true,
      help: "A number or num/den renders a gauge. Anything else shows as text.",
    },
    { key: "date", label: "Date", type: "date", placeholder: "2024", half: true },
    { key: "issuer", label: "Administered by", type: "text", placeholder: "ETS" },
    PROSE,
  ],

  custom: [{ key: "title", label: "Title", type: "text" }, PROSE, LINK],

  // Contact renders from identity (email/availability), so it has no items.
  contact: [],
};

/**
 * Per section type: its name (the title a new section gets, also shown in the editor), the
 * subtitle a new section is seeded with, and the editor's one-line description. One table, so the
 * store, the editor and the templates never disagree on a name ("Test Scores", never the camelCase
 * id).
 */
export const sectionMeta: Record<
  PortfolioSectionType,
  { label: string; subtitle: string; detail: string }
> = {
  projects: {
    label: "Projects",
    subtitle: "Selected work and the outcomes behind it.",
    detail: "Case studies and shipped work",
  },
  experience: {
    label: "Experience",
    subtitle: "Where I've worked and what I was responsible for.",
    detail: "Roles, teams, and outcomes",
  },
  services: {
    label: "Services",
    subtitle: "Ways we can work together.",
    detail: "Ways people can work with you",
  },
  skills: {
    label: "Skills",
    subtitle: "Tools and capabilities I work with.",
    detail: "Capabilities and tools",
  },
  education: {
    label: "Education",
    subtitle: "Formal study and training.",
    detail: "Degrees and training",
  },
  writing: {
    label: "Writing",
    subtitle: "Essays, notes, and talks.",
    detail: "Articles and talks",
  },
  testimonials: {
    label: "Testimonials",
    subtitle: "What people I've worked with say.",
    detail: "Words from collaborators",
  },
  awards: {
    label: "Awards",
    subtitle: "Recognition and honours.",
    detail: "Recognition and milestones",
  },
  certifications: {
    label: "Certifications",
    subtitle: "Credentials and licences.",
    detail: "Licenses, credentials, and courses",
  },
  languages: {
    label: "Languages",
    subtitle: "Languages I speak and write.",
    detail: "Spoken and written proficiencies",
  },
  interests: {
    label: "Interests",
    subtitle: "What I spend time on outside work.",
    detail: "Personal pursuits and hobbies",
  },
  publications: {
    label: "Publications",
    subtitle: "Papers, articles, and books.",
    detail: "Articles, papers, and books",
  },
  patents: {
    label: "Patents",
    subtitle: "Filed and granted inventions.",
    detail: "Inventions and intellectual property",
  },
  testScores: {
    label: "Test Scores",
    subtitle: "Standardized results.",
    detail: "Standardized tests and exams",
  },
  achievements: {
    label: "Achievements",
    subtitle: "Milestones worth noting.",
    detail: "Key milestones and recognitions",
  },
  volunteer: {
    label: "Volunteer Experience",
    subtitle: "Community and non-profit work.",
    detail: "Non-profit and community service",
  },
  custom: { label: "Custom Section", subtitle: "", detail: "Additional projects or lab sections" },
  contact: { label: "Contact", subtitle: "", detail: "Your closing invitation" },
};

/** A blank item pre-shaped with every key this section type uses. */
export function emptyItemFor(type: PortfolioSectionType): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of sectionFields[type] ?? []) {
    item[field.key] = field.type === "checkbox" ? false : "";
  }
  return item;
}
