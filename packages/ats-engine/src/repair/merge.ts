import { escapeRegex, normalizeText, wordListRegex } from "../text/text.js";
import { educationLevel } from "../parser/education.js";
import { isPlausibleDate } from "../parser/dates.js";
import { parseQuality } from "../parser/index.js";
import { finalizeParsed, type ParsedCore } from "../parser/record.js";
import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedDate, AtsParsedField, AtsParsedResume, AtsReport } from "../types.js";
import { findGroundingViolations, type GroundingViolation } from "./grounding.js";

/**
 * AI repair of a bad deterministic parse — the parts that are not a model call.
 *
 * The deterministic parser stays primary: it is free, explainable line by line, and cannot
 * invent an employer. A model pass only ever fills fields the parser left empty, on documents
 * where it visibly failed, and everything it returns is checked against the source text before
 * it is used. The host owns the model call and its billing; this module owns when to offer it
 * and what to accept from it.
 */

/** What a repair model returns: the recoverable fields, each possibly empty. */
export type AtsRepairCandidate = {
  name: string;
  email: string;
  phone: string;
  roles: Array<{
    title: string;
    employer: string;
    start: AtsParsedDate | null;
    end: AtsParsedDate | null;
    current: boolean;
  }>;
  education: Array<{ school: string; credential: string; end: AtsParsedDate | null }>;
  skills: string[];
};

/**
 * Whether the parse came back thin enough that a model re-read would likely help.
 *
 * Deliberately narrow: "the deterministic pass visibly failed", not "the score is low". A
 * well-parsed resume can score badly on its merits, and that is a finding to report rather than
 * a parse to repair — offering a paid pass there would be selling nothing.
 */
export function needsRepair(report: Pick<AtsReport, "parsed" | "wordCount">): boolean {
  // A structured document was read from its fields; a model re-reading its rendered text can
  // only find what the fields already said, so there is nothing to repair and nothing to charge.
  if (Object.values(report.parsed.provenance).includes("structured")) return false;
  const quality = parseQuality(report.parsed);

  // No roles from a document with real content is the archetype failure: an unknown heading, or
  // a column layout whose extraction interleaved the text.
  if (quality.rolesDetected === 0 && report.wordCount > 120) return true;
  // Rows recovered but missing employer or dates are a real gap, but not one to sell: the merge
  // never edits a row the parser found, so a repair would come back with the same rows.
  // A stacked header commonly costs every contact field at once.
  return quality.contactCompleteness < 1 / 3;
}

export type MergeOptions = {
  /** Classifies repaired credentials into degree levels. */
  policy: AtsEnginePolicy;
  /** Reference date for tenure and date plausibility. Defaults to the current time. */
  now?: Date;
};

export type MergeResult = {
  merged: AtsParsedResume;
  /** Values the model returned that do not occur in the source, with where each was found. */
  violations: GroundingViolation[];
};

/**
 * Fills gaps in the deterministic parse with grounded AI values.
 *
 * One-directional: a value the parser found is never overwritten, so the worst case for a
 * correct value is that it stays. A string the model returned that does not occur in the source
 * is dropped. A role or school survives only if its identifying field is grounded, and a date
 * outside the plausible range is dropped rather than trusted.
 *
 * Derived fields — tenure, highest degree, provenance — are recomputed from the merged values,
 * and every field the model filled is stamped `ai`.
 */
export function mergeGrounded(
  deterministic: AtsParsedResume,
  candidate: AtsRepairCandidate,
  source: string,
  { policy, now = new Date() }: MergeOptions,
): MergeResult {
  const violations = findGroundingViolations(candidate, source);
  const rejected = new Set(violations.map((violation) => violation.path));
  // A value must assert something: "--" or "()" would otherwise fill a contact field.
  const ok = (path: string, value: string) => /[\p{L}\p{N}]/u.test(value) && !rejected.has(path);

  // Dates and "current" set tenure, the field recruiters filter on, so they are grounded too: a
  // year must appear in the document and "current" needs a present-tense word somewhere in it.
  // Without this a grounded employer could carry a fabricated 1990 start.
  const text = normalizeText(source);
  const years = new Set(text.match(/(?<!\d)(?:19|20)\d{2}(?!\d)/g));
  const date = (value: AtsParsedDate | null) =>
    isPlausibleDate(value, now) && years.has(String(value.year)) ? value : null;
  const saysCurrent = wordListRegex(
    policy.resumeParse.openEnded.map((word) => escapeRegex(normalizeText(word))),
  ).test(text);

  const core: ParsedCore = { ...deterministic };
  const filled = new Set<AtsParsedField>();

  for (const field of ["name", "email", "phone"] as const)
    if (!core[field] && ok(field, candidate[field])) {
      core[field] = candidate[field];
      filled.add(field);
    }

  if (core.roles.length === 0) {
    const roles = candidate.roles.flatMap((role, index) => {
      const title = ok(`roles[${index}].title`, role.title) ? role.title : "";
      const employer = ok(`roles[${index}].employer`, role.employer) ? role.employer : "";
      if (!title && !employer) return [];
      const current = role.current && saysCurrent;
      return [
        { title, employer, start: date(role.start), end: current ? null : date(role.end), current },
      ];
    });
    if (roles.length) {
      core.roles = roles;
      filled.add("roles");
    }
  }

  if (core.education.length === 0) {
    const education = candidate.education.flatMap((entry, index) => {
      if (!ok(`education[${index}].school`, entry.school)) return [];
      const credential = ok(`education[${index}].credential`, entry.credential)
        ? entry.credential
        : "";
      return [
        {
          school: entry.school,
          credential,
          ...educationLevel(credential, policy),
          end: date(entry.end),
        },
      ];
    });
    if (education.length) {
      core.education = education;
      filled.add("education");
    }
  }

  if (core.skills.length === 0) {
    const skills = candidate.skills.filter((skill, index) => ok(`skills[${index}]`, skill));
    if (skills.length) {
      core.skills = skills;
      filled.add("skills");
    }
  }

  return {
    merged: finalizeParsed(
      core,
      (field) => (filled.has(field) ? "ai" : deterministic.provenance[field]),
      now,
    ),
    violations,
  };
}
