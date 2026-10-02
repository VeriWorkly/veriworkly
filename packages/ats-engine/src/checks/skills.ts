import { escapeRegex, wordListPattern } from "../text/text.js";
import type { ResumeSection } from "../parser/sections.js";
import { NO_FINDING, quote, type Finding } from "./finding.js";

/** Below this many listed skills a share means little, and the check stands down. */
const MIN_SKILLS = 3;

/**
 * Listed skills the rest of the resume never mentions: the share of them, and the first few.
 *
 * An LLM screener grading a resume against a posting now asks where each skill was used (Workday
 * HiredScore's "Fit & Gap", Ashby's per-criterion citations), and a recruiter reads a skills list
 * the same way. A skill only in the list is a claim; the same skill in a role's bullet is
 * evidence. Read across every section but Skills, so a project counts as evidence too.
 *
 * Null — not applicable — for a short list, or a resume with nothing but its skills to read.
 */
export function unsupportedSkills(
  sections: readonly ResumeSection[],
  skills: string[],
): Finding | null {
  if (skills.length < MIN_SKILLS) return null;
  const elsewhere = sections
    .filter((section) => section.kind !== "skills")
    .flatMap((section) => section.lines)
    .join("\n");
  if (!elsewhere.trim()) return null;

  // A substring test first: a skill absent as text is absent as a word, without a pattern.
  const lower = elsewhere.toLowerCase();
  const missing = skills.filter(
    (skill) =>
      !lower.includes(skill.toLowerCase()) ||
      !new RegExp(wordListPattern([escapeRegex(skill)]), "iu").test(elsewhere),
  );
  return missing.length
    ? { value: missing.length / skills.length, sample: quote(missing.slice(0, 5).join(", ")) }
    : NO_FINDING;
}
