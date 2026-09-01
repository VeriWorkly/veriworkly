import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedResume } from "../types.js";
import { EMAIL, LINK, PHONE, findName } from "./contact.js";
import { highestDegree, parseEducation } from "./education.js";
import { BULLET, parseRoles } from "./experience.js";
import { segmentResume, type ResumeSectionKind } from "./sections.js";
import { monthsOfExperience } from "./tenure.js";

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
