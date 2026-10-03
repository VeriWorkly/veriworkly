import {
  ATS_DOCUMENT_FORMAT,
  DOCUMENT_LIMITS,
  type AtsDocumentEntry,
  type AtsDocumentSection,
  type AtsResumeDocument,
} from "./types.js";

/**
 * JSON Resume (https://jsonresume.org/schema) -> `AtsResumeDocument`.
 *
 * JSON Resume files are user-authored and loosely followed in the wild, so every field is read
 * defensively: a value of the wrong type is treated as absent rather than trusted. The schema
 * carries no section headings, so the English defaults below are used.
 *
 * Section order follows the schema's conventional print order. JSON Resume has no notion of a
 * hidden section — anything present is rendered.
 */

type Json = Record<string, unknown>;

const title = {
  summary: "Summary",
  work: "Experience",
  volunteer: "Volunteering",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  awards: "Awards",
  certificates: "Certifications",
  publications: "Publications",
  languages: "Languages",
  interests: "Interests",
  references: "References",
};

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Array reads are bounded before anything is mapped. A JSON Resume can arrive through a public
 * API, and an unbounded read would make the adapter do work proportional to an attacker's
 * array before the document limits are ever checked. Each list is cut to the limit of the
 * document field it fills — a role's highlights to `lines`, not `items` — because the schema
 * rejects an over-long list, and a file with 150 highlights is still the user's resume.
 */
const MAX_ITEMS = DOCUMENT_LIMITS.items;
const MAX_LINES = DOCUMENT_LIMITS.lines;
const MAX_KEYWORDS = DOCUMENT_LIMITS.keywords;

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const strings = (value: unknown, max: number) =>
  Array.isArray(value) ? value.slice(0, max).map(str).filter(Boolean) : [];

const objects = (value: unknown) =>
  Array.isArray(value) ? value.slice(0, MAX_ITEMS).filter(isObject) : [];

/**
 * Whether an object reads as a JSON Resume.
 *
 * Keyed on what is distinctive to the schema, not on what resume formats share: `basics`,
 * `education` and `skills` appear in most of them, and a Studio-shaped document carrying those
 * three was once taken for a JSON Resume and lost its name and education to the wrong field
 * names. So a `work` array, or an education entry with an `institution`, is required, and a
 * `basics.fullName` (other formats' spelling of `basics.name`) rules it out.
 */
export function isJsonResume(value: unknown): value is Record<string, unknown> {
  if (!isObject(value) || "format" in value) return false;
  const basics = value.basics;
  if (!isObject(basics) || "fullName" in basics) return false;
  return (
    Array.isArray(value.work) ||
    objects(value.education).some((entry) => typeof entry.institution === "string")
  );
}

/** "Present" is how most hand-written files say a role is current, instead of omitting the end. */
const PRESENT = /^(?:present|current|now|ongoing|to date|till date)$/i;

/** JSON Resume allows YYYY-MM-DD and full ISO datetimes; the document contract is YYYY-MM. */
function date(value: unknown) {
  const raw = str(value);
  if (PRESENT.test(raw)) return undefined;
  const match = /^(\d{4})(?:-(\d{1,2}))?(?:-\d{1,2})?(?:T.*)?$/.exec(raw);
  if (!match) return raw || undefined;
  return match[2] ? `${match[1]}-${match[2].padStart(2, "0")}` : match[1];
}

/** Current when there is a start and the end is absent or says "present". */
const isCurrent = (item: Json) =>
  Boolean(str(item.startDate)) && (!str(item.endDate) || PRESENT.test(str(item.endDate)));

const optional = (value: string) => value || undefined;

/** A role with neither a title nor an employer names nothing and is dropped. */
const identified = (role: { title: string; employer: string }) =>
  Boolean(role.title || role.employer);

function entries(
  items: Json[],
  heading: (item: Json) => Array<string | undefined>,
  lines: (item: Json) => string[],
): AtsDocumentEntry[] {
  return items
    .map((item) => ({
      heading: optional(heading(item).filter(Boolean).join(", ")),
      lines: lines(item).slice(0, MAX_LINES),
    }))
    .filter((entry) => entry.heading || entry.lines.length);
}

export function fromJsonResume(json: unknown): AtsResumeDocument {
  const resume = isObject(json) ? json : {};
  const basics = isObject(resume.basics) ? resume.basics : {};
  const location = isObject(basics.location) ? basics.location : {};

  const links = [str(basics.url), ...objects(basics.profiles).map((profile) => str(profile.url))]
    .filter(Boolean)
    .slice(0, DOCUMENT_LIMITS.links);

  const sections: AtsDocumentSection[] = [];
  const add = (section: AtsDocumentSection) => {
    if (section.kind === "summary" ? section.text : section.items.length) sections.push(section);
  };

  add({ kind: "summary", title: title.summary, text: str(basics.summary) });

  add({
    kind: "experience",
    title: title.work,
    items: objects(resume.work)
      .map((work) => ({
        title: str(work.position),
        employer: str(work.name),
        location: optional(str(work.location)),
        start: date(work.startDate),
        end: date(work.endDate),
        // JSON Resume marks a current role by omitting the end date.
        current: isCurrent(work),
        summary: optional(str(work.summary) || str(work.description)),
        highlights: strings(work.highlights, MAX_LINES),
      }))
      .filter(identified),
  });

  // Volunteering is its own section, not work history: an ATS files it separately and it does
  // not count toward years of experience, so it is rendered but never read as roles.
  add({
    kind: "other",
    title: title.volunteer,
    items: entries(
      objects(resume.volunteer),
      (item) => [
        str(item.position),
        str(item.organization),
        [date(item.startDate), date(item.endDate) ?? (str(item.startDate) ? "Present" : undefined)]
          .filter(Boolean)
          .join(" - "),
      ],
      (item) => [
        ...(str(item.summary) ? [str(item.summary)] : []),
        ...strings(item.highlights, MAX_LINES),
      ],
    ),
  });

  add({
    kind: "education",
    title: title.education,
    items: objects(resume.education)
      .map((education) => ({
        school: str(education.institution),
        credential: optional(str(education.studyType)),
        field: optional(str(education.area)),
        start: date(education.startDate),
        end: date(education.endDate),
      }))
      .filter((entry) => entry.school || entry.credential),
  });

  add({
    kind: "projects",
    title: title.projects,
    items: objects(resume.projects)
      .map((project) => ({
        name: str(project.name),
        role: optional(strings(project.roles, MAX_ITEMS).join(", ")),
        url: optional(str(project.url)),
        summary: optional(str(project.description)),
        highlights: strings(project.highlights, MAX_LINES),
        skills: strings(project.keywords, MAX_KEYWORDS),
      }))
      .filter((project) => project.name),
  });

  add({
    kind: "skills",
    title: title.skills,
    items: objects(resume.skills)
      .map((skill) => ({
        name: optional(str(skill.name)),
        keywords: strings(skill.keywords, MAX_KEYWORDS),
      }))
      .filter((group) => group.name || group.keywords.length),
  });

  add({
    kind: "other",
    title: title.certificates,
    items: entries(
      objects(resume.certificates),
      (item) => [str(item.name), str(item.issuer), date(item.date)],
      () => [],
    ),
  });

  add({
    kind: "other",
    title: title.awards,
    items: entries(
      objects(resume.awards),
      (item) => [str(item.title), str(item.awarder), date(item.date)],
      (item) => (str(item.summary) ? [str(item.summary)] : []),
    ),
  });

  add({
    kind: "other",
    title: title.publications,
    items: entries(
      objects(resume.publications),
      (item) => [str(item.name), str(item.publisher), date(item.releaseDate)],
      (item) => (str(item.summary) ? [str(item.summary)] : []),
    ),
  });

  add({
    kind: "other",
    title: title.languages,
    items: entries(
      objects(resume.languages),
      (item) => [str(item.language), str(item.fluency)],
      () => [],
    ),
  });

  add({
    kind: "other",
    title: title.interests,
    items: entries(
      objects(resume.interests),
      (item) => [str(item.name)],
      (item) => [strings(item.keywords, MAX_KEYWORDS).join(", ")].filter(Boolean),
    ),
  });

  add({
    kind: "other",
    title: title.references,
    items: entries(
      objects(resume.references),
      (item) => [str(item.name)],
      (item) => (str(item.reference) ? [str(item.reference)] : []),
    ),
  });

  return {
    format: ATS_DOCUMENT_FORMAT,
    basics: {
      name: str(basics.name),
      headline: optional(str(basics.label)),
      email: optional(str(basics.email)),
      phone: optional(str(basics.phone)),
      location: optional([str(location.city), str(location.region)].filter(Boolean).join(", ")),
      links,
    },
    sections,
  };
}
