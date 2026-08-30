import type { AtsEnginePolicy } from "#services/ats/enginePolicy";
import type {
  AtsDegreeLevel,
  AtsParsedDate,
  AtsParsedEducation,
  AtsParsedResume,
  AtsParsedRole,
} from "#services/ats/types";

/**
 * Recovers the fields an applicant tracking system stores, from the same plain text one would
 * receive.
 *
 * The point is not to parse perfectly. It is to parse *representatively*: an ATS shreds a resume
 * into name, contact, and one row per job holding an employer, a title and a date range, then
 * lets recruiters search and filter those rows. A resume whose job history cannot be recovered
 * does not rank badly — it arrives with empty columns, and no amount of keyword density fixes
 * that. So when this parser cannot find a field, that is itself the finding worth reporting, and
 * the recovered rows are worth showing the candidate verbatim: this is what the software sees.
 *
 * Everything here is deterministic and stays on the free tier. No model is involved.
 */

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MONTH_NAMES = Object.keys(MONTHS).join("|");

/** A single point in time, in any of the spellings a resume actually uses. */
const DATE = String.raw`(?:(?:${MONTH_NAMES})[a-z]*\.?\s+\d{4}|\d{1,2}\s*[/-]\s*\d{4}|\d{4}\s*-\s*\d{2}|\d{4})`;

/** "Present", and the other ways of saying it. */
const OPEN_ENDED = String.raw`(?:present|current|now|ongoing|to\s*date|till\s*date)`;

const RANGE_SEPARATOR = String.raw`\s*(?:–|—|-|~|to|until|through)\s*`;

const DATE_RANGE = new RegExp(String.raw`(${DATE})${RANGE_SEPARATOR}(${DATE}|${OPEN_ENDED})`, "i");

/** A lone year range like "2019 - 2022" is ambiguous with a numeric bullet; require four digits. */
const YEAR_ONLY = /^\d{4}$/;

function parseDate(raw: string): AtsParsedDate | null {
  const value = raw.trim().toLowerCase();

  const named = value.match(new RegExp(String.raw`^(${MONTH_NAMES})[a-z]*\.?\s+(\d{4})$`));
  if (named) return { year: Number(named[2]), month: MONTHS[named[1]] };

  const numeric = value.match(/^(\d{1,2})\s*[/-]\s*(\d{4})$/);
  if (numeric && Number(numeric[1]) >= 1 && Number(numeric[1]) <= 12)
    return { year: Number(numeric[2]), month: Number(numeric[1]) };

  // ISO-ish "2021-03", which is how a Studio document serialises its dates.
  const iso = value.match(/^(\d{4})\s*-\s*(\d{2})$/);
  if (iso && Number(iso[2]) >= 1 && Number(iso[2]) <= 12)
    return { year: Number(iso[1]), month: Number(iso[2]) };

  if (YEAR_ONLY.test(value)) return { year: Number(value), month: null };
  return null;
}

type DateRange = { start: AtsParsedDate | null; end: AtsParsedDate | null; current: boolean };

function findDateRange(line: string): { range: DateRange; matched: string } | null {
  const match = line.match(DATE_RANGE);
  if (!match) return null;

  const end = match[2];
  const current = new RegExp(`^${OPEN_ENDED}$`, "i").test(end.trim());

  return {
    range: { start: parseDate(match[1]), end: current ? null : parseDate(end), current },
    matched: match[0],
  };
}

/* ------------------------------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------------------------------ */

type ResumeSectionKind = "experience" | "education" | "skills" | "projects" | "other";

type ResumeSection = { kind: ResumeSectionKind; lines: string[] };

function isHeadingLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/[.,;]$/.test(trimmed)) return false;
  return trimmed.split(/\s+/).length <= 8;
}

/**
 * Splits the resume at its headings.
 *
 * Every heading terminates the previous block, including headings we do not classify —
 * "Certifications", "Awards", "Publications". Without that, a certifications list sitting below
 * the last job would be read as part of the work history and every line in it examined for a
 * date range.
 */
function segmentResume(lines: string[], policy: AtsEnginePolicy): ResumeSection[] {
  const { sections: patterns } = policy.resumeParse;
  const matchers: Array<{ kind: ResumeSectionKind; re: RegExp }> = [
    { kind: "experience", re: new RegExp(patterns.experience, "i") },
    { kind: "education", re: new RegExp(patterns.education, "i") },
    { kind: "skills", re: new RegExp(patterns.skills, "i") },
    { kind: "projects", re: new RegExp(patterns.projects, "i") },
    { kind: "other", re: new RegExp(patterns.other, "i") },
  ];

  const sections: ResumeSection[] = [];
  let current: ResumeSection = { kind: "other", lines: [] };

  for (const line of lines) {
    const heading = isHeadingLine(line)
      ? matchers.find(({ re }) => re.test(line))?.kind
      : undefined;

    if (heading) {
      if (current.lines.length) sections.push(current);
      current = { kind: heading, lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.lines.length) sections.push(current);

  return sections;
}

/* ------------------------------------------------------------------------------------------ *
 * Contact
 * ------------------------------------------------------------------------------------------ */

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;
const LINK = /(?:https?:\/\/|www\.)[^\s|,]+|(?:linkedin\.com|github\.com)\/[^\s|,]+/gi;

/**
 * The candidate's name, taken from the top of the document.
 *
 * An ATS reads the name from the header block, so this looks only at the first few lines and
 * takes the first that reads like a person rather than a contact detail or a job title. Getting
 * this wrong is cheap — it is reported, not scored on its content — but not finding one at all
 * is worth knowing, because it usually means the name is inside an image or a text box.
 */
function findName(lines: string[]) {
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    if (!trimmed || EMAIL.test(trimmed) || PHONE.test(trimmed)) continue;
    if (/\d/.test(trimmed)) continue;

    const words = trimmed.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;
    // Names are capitalised; an all-caps banner or a title-cased headline both qualify, which is
    // fine — anything at the very top with this shape is what the parser would take.
    if (words.every((word) => /^[A-Z][A-Za-z'’.-]*$/.test(word) || /^[A-Z.'’-]+$/.test(word)))
      return trimmed;
  }
  return "";
}

/* ------------------------------------------------------------------------------------------ *
 * Work history
 * ------------------------------------------------------------------------------------------ */

const BULLET = /^[-•*◦▪–—·]/;

/**
 * Splits a role header into a job title and an employer.
 *
 * Resumes write this both ways round — "Staff Engineer, Acme" and "Acme — Staff Engineer" — so
 * the side carrying a recognisable job-title word decides, rather than the position. When
 * neither side looks like a title the first is taken as the title, which is the more common
 * order; the field is still reported, and the completeness check below is what tells the
 * candidate the pair was ambiguous.
 */
function splitTitleAndEmployer(header: string, policy: AtsEnginePolicy) {
  const cleaned = header
    .replace(BULLET, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[|,\-–—\s]+|[|,\-–—\s]+$/g, "");

  if (!cleaned) return { title: "", employer: "" };

  const parts = cleaned
    .split(/\s+[|·•]\s+|\s+[–—]\s+|,\s+|\s+\bat\b\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1) return { title: parts[0], employer: "" };

  const titleWords = new RegExp(`\\b(?:${policy.resumeParse.titleWords.join("|")})\\b`, "i");
  const titleIndex = parts.findIndex((part) => titleWords.test(part));

  if (titleIndex === -1) return { title: parts[0], employer: parts.slice(1).join(", ") };

  const employer = parts.filter((_, index) => index !== titleIndex).join(", ");
  return { title: parts[titleIndex], employer };
}

/**
 * Recovers one row per job.
 *
 * A date range anchors each entry, because that is the one element every work-history block has
 * and the one an ATS needs in order to compute tenure at all. The title and employer are then
 * read from the same line, or from the line immediately above when the resume puts the dates on
 * their own line — both layouts are common.
 */
function parseRoles(lines: string[], policy: AtsEnginePolicy): AtsParsedRole[] {
  const roles: AtsParsedRole[] = [];

  lines.forEach((line, index) => {
    const found = findDateRange(line);
    if (!found) return;

    const remainder = line.replace(found.matched, " ").trim();
    const previous = index > 0 ? lines[index - 1] : "";

    // A date line on its own carries no title; the header is the line above it, as long as that
    // line is a header rather than another bullet of the previous job.
    const headerSource =
      remainder.replace(/[^A-Za-z]/g, "").length >= 3
        ? remainder
        : !BULLET.test(previous) && isHeadingLine(previous)
          ? previous
          : "";

    const { title, employer } = splitTitleAndEmployer(headerSource, policy);
    roles.push({ ...found.range, title, employer });
  });

  return roles;
}

/** Calendar months covered by at least one role, so concurrent jobs are not counted twice. */
function monthsOfExperience(roles: AtsParsedRole[], now: Date) {
  const toIndex = (date: AtsParsedDate) => date.year * 12 + (date.month ?? 1) - 1;
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();

  const spans = roles
    .filter((role) => role.start)
    .map((role) => {
      const start = toIndex(role.start as AtsParsedDate);
      const end = role.current ? nowIndex : role.end ? toIndex(role.end) : start;
      return { start, end: Math.max(start, Math.min(end, nowIndex)) };
    })
    .sort((a, b) => a.start - b.start);

  if (!spans.length) return null;

  let total = 0;
  let cursor = -Infinity;
  for (const span of spans) {
    const from = Math.max(span.start, cursor === -Infinity ? span.start : cursor);
    if (span.end >= from) total += span.end - from + 1;
    cursor = Math.max(cursor, span.end + 1);
  }
  return total;
}

/* ------------------------------------------------------------------------------------------ *
 * Education
 * ------------------------------------------------------------------------------------------ */

const DEGREE_ORDER: AtsDegreeLevel[] = ["diploma", "associate", "bachelor", "master", "doctorate"];

function parseEducation(lines: string[], policy: AtsEnginePolicy): AtsParsedEducation[] {
  const { degrees, schoolWords } = policy.resumeParse;
  const schools = new RegExp(`\\b(?:${schoolWords.join("|")})\\b`, "i");
  const levels = Object.entries(degrees).map(([level, pattern]) => ({
    level: level as AtsDegreeLevel,
    re: new RegExp(pattern, "i"),
  }));

  const entries: AtsParsedEducation[] = [];

  for (const line of lines) {
    const matchedLevel = levels.find(({ re }) => re.test(line));
    const isSchool = schools.test(line);
    if (!matchedLevel && !isSchool) continue;

    const range = findDateRange(line);
    const credential = matchedLevel ? (line.match(matchedLevel.re)?.[0] ?? "").trim() : "";

    // The date range comes out before the institution is read, otherwise it rides along on the
    // end of the school name — an entry reading "University of California - 2014 - 2018" is not
    // the employer-equivalent field a recruiter would search on.
    const withoutDates = range ? line.replace(range.matched, " ") : line;
    const school = isSchool
      ? (withoutDates
          .split(/[|,•·]|\s+[–—-]\s+/)
          .map((part) => part.trim().replace(/[\s,–—-]+$/, ""))
          .find((part) => schools.test(part)) ?? "")
      : "";

    entries.push({
      school,
      credential,
      level: matchedLevel?.level ?? null,
      end: range?.range.end ?? null,
    });
  }

  return entries;
}

function highestDegree(entries: AtsParsedEducation[]) {
  let best: AtsDegreeLevel | null = null;
  for (const entry of entries) {
    if (!entry.level) continue;
    if (!best || DEGREE_ORDER.indexOf(entry.level) > DEGREE_ORDER.indexOf(best)) best = entry.level;
  }
  return best;
}

/* ------------------------------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------------------------------ */

const MAX_REPORTED = { roles: 20, education: 10, skills: 60, links: 10 };

export function parseResume(
  lines: string[],
  policy: AtsEnginePolicy,
  now = new Date(),
): AtsParsedResume {
  const sections = segmentResume(lines, policy);
  const joined = lines.join("\n");

  const take = (kind: ResumeSectionKind) =>
    sections.filter((section) => section.kind === kind).flatMap((section) => section.lines);

  const experienceLines = take("experience");
  // A resume with no recognisable Experience heading still has a work history somewhere. Falling
  // back to the whole document means the rows are still recovered — and the missing heading is
  // separately reported by the structure rules, rather than being punished twice here.
  const roles = parseRoles(experienceLines.length ? experienceLines : lines, policy);
  const education = parseEducation(take("education").length ? take("education") : lines, policy);

  const skills = take("skills")
    .flatMap((line) => line.split(/[,;|•·]|\s{2,}/))
    .map((skill) => skill.replace(BULLET, "").trim())
    .filter((skill) => skill.length > 1 && skill.length <= 60);

  return {
    name: findName(lines),
    email: joined.match(EMAIL)?.[0] ?? "",
    phone: joined.match(PHONE)?.[0] ?? "",
    links: [...new Set(joined.match(LINK) ?? [])].slice(0, MAX_REPORTED.links),
    roles: roles.slice(0, MAX_REPORTED.roles),
    education: education.slice(0, MAX_REPORTED.education),
    skills: [...new Set(skills)].slice(0, MAX_REPORTED.skills),
    monthsOfExperience: monthsOfExperience(roles, now),
    highestDegree: highestDegree(education),
  };
}

/**
 * How much of what an ATS needs was actually recoverable.
 *
 * `roleCompleteness` is the one that matters most: a job row missing its employer or its dates
 * is a row a recruiter's filter cannot match on, however well the bullets underneath it read.
 */
export function parseQuality(parsed: AtsParsedResume) {
  const complete = parsed.roles.filter((role) => role.title && role.employer && role.start).length;
  const dated = parsed.roles.filter((role) => role.start).length;
  const contactFields = [parsed.name, parsed.email, parsed.phone].filter(Boolean).length;

  return {
    rolesDetected: parsed.roles.length,
    roleCompleteness: parsed.roles.length ? complete / parsed.roles.length : 0,
    datedRoleRatio: parsed.roles.length ? dated / parsed.roles.length : 0,
    contactCompleteness: contactFields / 3,
    educationDetected: parsed.education.length,
  };
}
