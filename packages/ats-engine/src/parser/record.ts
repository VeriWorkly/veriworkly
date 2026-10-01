import type { AtsParsedField, AtsParsedResume, AtsProvenance } from "../types.js";
import { degreeLabel, highestIsced } from "./education.js";
import { monthsOfExperience } from "./tenure.js";

/** The recovered values themselves; everything else in `AtsParsedResume` is derived from them. */
export type ParsedCore = Omit<
  AtsParsedResume,
  "monthsOfExperience" | "highestIsced" | "highestDegree" | "provenance"
>;

export const PARSED_FIELDS: readonly AtsParsedField[] = [
  "name",
  "email",
  "phone",
  "roles",
  "education",
  "skills",
];

const MAX_REPORTED = { roles: 20, education: 10, skills: 60, links: 10 };

/**
 * Caps the lists, derives tenure and highest degree, and stamps provenance.
 *
 * Every producer of a parsed record goes through here — the text parser, the structured
 * document reader, and the AI repair merge — so the derived fields can never disagree with the
 * values they are derived from. The repair merge used to replace the roles and keep the old
 * `monthsOfExperience`, so a repaired resume showed its jobs beside "no experience".
 *
 * A field that holds nothing is `none` whatever `sourceOf` says: provenance describes a value,
 * and an empty field has no value to describe.
 */
export function finalizeParsed(
  core: ParsedCore,
  sourceOf: (field: AtsParsedField) => AtsProvenance,
  now: Date,
): AtsParsedResume {
  const capped: ParsedCore = {
    name: core.name,
    email: core.email,
    phone: core.phone,
    links: [...new Set(core.links)].slice(0, MAX_REPORTED.links),
    roles: core.roles.slice(0, MAX_REPORTED.roles),
    education: core.education.slice(0, MAX_REPORTED.education),
    skills: [...new Set(core.skills)].slice(0, MAX_REPORTED.skills),
  };

  const provenance = {} as Record<AtsParsedField, AtsProvenance>;
  for (const field of PARSED_FIELDS)
    provenance[field] = capped[field].length > 0 ? sourceOf(field) : "none";
  const highest = highestIsced(core.education);

  return {
    ...capped,
    // Tenure counts every recovered role, not only the reported ones: capping the table at 20
    // rows is a display decision and must not shorten someone's career.
    monthsOfExperience: monthsOfExperience(core.roles, now),
    highestIsced: highest,
    highestDegree: highest === null ? null : degreeLabel(highest),
    provenance,
  };
}
