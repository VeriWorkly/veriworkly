import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedResume } from "../types.js";
import { EMAIL, LINK, findName } from "./contact.js";
import { parseEducation } from "./education.js";
import { BULLET_PREFIX } from "../text/text.js";
import { parseRoles } from "./experience.js";
import { finalizeParsed } from "./record.js";
import { readResumeLines } from "./lines.js";
import { findPhone } from "./phone.js";
import { segmentResume, type ResumeSectionKind } from "./sections.js";

/**
 * The category label on a skills line — "Languages: " in "Languages: TypeScript, Go". Needs a
 * space after the colon, so a value with a colon of its own ("https://…") is left whole.
 */
const SKILL_LABEL = /^[^:,;|]{1,40}:\s+/;

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
export function parseResume(
  lines: string[],
  policy: AtsEnginePolicy,
  now = new Date(),
): AtsParsedResume {
  return parseReadLines(readResumeLines(lines, policy).lines, policy, now);
}

/**
 * `parseResume` on lines already through `readResumeLines`, as `check` has them, and already
 * segmented when the caller has done that too.
 */
export function parseReadLines(
  lines: string[],
  policy: AtsEnginePolicy,
  now: Date,
  sections = segmentResume(lines, policy),
): AtsParsedResume {
  const joined = lines.join("\n");

  const take = (kind: ResumeSectionKind) =>
    sections.filter((section) => section.kind === kind).flatMap((section) => section.lines);

  const experienceLines = take("experience");
  // A resume with no recognisable Experience heading still has a work history somewhere, so the
  // fallback reads every block except the ones known not to hold jobs: a degree's "2010 - 2014"
  // read as a role once added four years of experience nobody worked.
  const roles = parseRoles(
    experienceLines.length
      ? experienceLines
      : sections
          .filter((section) => !["education", "skills", "projects"].includes(section.kind))
          .flatMap((section) => section.lines),
    policy,
    now,
  );
  const education = parseEducation(
    take("education").length ? take("education") : lines,
    policy,
    now,
  );

  const skills = take("skills")
    .flatMap((line) =>
      line
        .replace(BULLET_PREFIX, "")
        .replace(SKILL_LABEL, "")
        .split(/[,;|•·]|\s{2,}/),
    )
    .map((skill) => skill.replace(BULLET_PREFIX, "").trim())
    // A skill names something, so it has a letter: a date or a number under the Skills heading
    // ("Geburtsdatum: 04.05.1990", once its label is dropped) is not one.
    .filter(
      (skill) =>
        // One letter is a skill only as a capital — the languages R and C — not a stray "o".
        (skill.length > 1 || /^\p{Lu}$/u.test(skill)) &&
        skill.length <= 60 &&
        /\p{L}/u.test(skill) &&
        // Nor is an address: a links list under the skills is links.
        !/^(?:https?:\/\/|www\.)|@/i.test(skill),
    );

  return finalizeParsed(
    {
      name: findName(lines, policy),
      email: joined.match(EMAIL)?.[0] ?? "",
      phone: findPhone(joined, policy, now),
      links: (joined.match(LINK) ?? []).map((link) =>
        link.replace(/(?<![).,;:!?'"])[).,;:!?'"]+$/, ""),
      ),
      roles,
      education,
      skills,
    },
    () => "parser",
    now,
  );
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
