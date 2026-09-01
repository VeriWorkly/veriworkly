import type { AtsEnginePolicy } from "../policy/schema.js";
import { alternationGroups } from "./alternation.js";
import { segmentJob, type JobSectionKind } from "./jobSections.js";
import {
  buildVocabulary,
  extractVocabulary,
  properNounTokens,
  resumeCapabilities,
} from "./vocabulary.js";

export type JobMatch = {
  score: number | null;
  matched: string[];
  missing: string[];
};

/**
 * Scores the resume against the posting.
 *
 * Two independent defences keep boilerplate out of the score, because either one alone is
 * defeatable. Section scoping drops "About us", benefits, and EEO copy entirely — but only
 * works on a posting that has headings. Specificity weighting discounts ordinary English
 * against recognised skills and proper nouns — and works on any posting, headings or not.
 * Without both, a strong candidate scored around 30 against a posting they matched completely,
 * because "dental", "stipend" and the employer's own name counted the same as "Kubernetes".
 */
export function computeJobMatch(
  resumeText: string,
  jobDescription: string | undefined,
  policy: AtsEnginePolicy,
): JobMatch {
  const km = policy.keywordMatch;
  const jobText = jobDescription?.trim();
  if (!jobText) return { score: null, matched: [], missing: [] };

  const vocab = buildVocabulary(km);
  const sections = segmentJob(jobText, km);
  const proper = properNounTokens(jobText);

  const sectionWeight: Record<JobSectionKind, number> = {
    required: km.requiredWeight,
    preferred: km.preferredWeight,
    responsibilities: km.responsibilitiesWeight,
    body: km.defaultWeight,
    excluded: 0,
  };

  // A term can appear in more than one block. Keep the strongest claim: a skill listed under
  // Requirements is required even if it is mentioned again in the responsibilities prose.
  const terms = new Map<string, { label: string; weight: number; skill: boolean }>();
  const scoredLines: string[] = [];

  for (const section of sections) {
    const weight = sectionWeight[section.kind];
    if (weight <= 0) continue;
    // Appended rather than spread: a posting is capped at 20k characters, which is more than
    // enough newlines to push a spread past the engine's argument-count limit.
    for (const line of section.text.split("\n")) scoredLines.push(line);

    for (const [token, term] of extractVocabulary(section.text, km, vocab)) {
      const skill = term.skill || proper.has(term.label) || proper.has(token);
      const specificity = skill ? 1 : km.generalTermWeight;
      const scored = weight * specificity;
      const existing = terms.get(token);
      if (!existing || scored > existing.weight)
        terms.set(token, { label: term.label, weight: scored, skill });
    }
  }

  if (terms.size === 0) return { score: null, matched: [], missing: [] };

  const held = resumeCapabilities(extractVocabulary(resumeText, km, vocab), vocab);
  const find = alternationGroups(scoredLines, km, vocab);

  // Alternatives collapse into one requirement worth one member's weight, satisfied by any of
  // them. "Go or Java" is a single ask, not two.
  type Group = {
    members: Array<{ label: string; skill: boolean }>;
    weight: number;
    matched: string | null;
  };
  const groups = new Map<string, Group>();

  for (const [token, term] of terms) {
    const root = find(token);
    const group = groups.get(root) ?? { members: [], weight: 0, matched: null };
    group.members.push({ label: term.label, skill: term.skill });
    group.weight = Math.max(group.weight, term.weight);
    if (group.matched === null && held.has(token)) group.matched = term.label;
    groups.set(root, group);
  }

  let totalWeight = 0;
  let matchedWeight = 0;
  const matched: Array<{ label: string; weight: number; skill: boolean }> = [];
  const missing: Array<{ label: string; weight: number; skill: boolean }> = [];

  for (const group of groups.values()) {
    totalWeight += group.weight;
    const skill = group.members.some((member) => member.skill);
    if (group.matched !== null) {
      matchedWeight += group.weight;
      matched.push({ label: group.matched, weight: group.weight, skill });
    } else {
      // Named as the choice the posting actually offered, so the advice reads "Go or Java"
      // rather than listing each alternative as a separate gap.
      missing.push({
        label: group.members.map((member) => member.label).join(" or "),
        weight: group.weight,
        skill,
      });
    }
  }

  // Recognised skills lead both lists regardless of section weight: a missing skill is always
  // more actionable advice than a missing ordinary word, and these lists are what the user is
  // shown and what the AI layer is handed as evidence.
  const rank = (a: { weight: number; skill: boolean }, b: { weight: number; skill: boolean }) =>
    Number(b.skill) - Number(a.skill) || b.weight - a.weight;

  matched.sort(rank);
  missing.sort(rank);

  return {
    score: totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : null,
    matched: matched.slice(0, 12).map((m) => m.label),
    missing: missing.slice(0, 12).map((m) => m.label),
  };
}
