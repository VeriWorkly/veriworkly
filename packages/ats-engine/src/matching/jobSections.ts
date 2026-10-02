import { classifyHeading, headingConnector, type HeadingMatchers } from "../parser/sections.js";
import type { AtsEnginePolicy } from "../policy/schema.js";
import { policyRegex } from "../policy/regex.js";

export type JobSectionKind = "required" | "preferred" | "responsibilities" | "body" | "excluded";

export type JobSection = { kind: JobSectionKind; text: string };

/**
 * Splits a job posting into labelled blocks, each running from its heading to the *next*
 * heading.
 *
 * The previous implementation took a fixed 600-character window after a "Requirements" heading.
 * On a normally formatted posting that window overshoots the requirements list and swallows the
 * nice-to-haves and responsibilities that follow it, so optional skills were billed at the
 * required weight and the preferred discount could never apply. Terminating at the next heading
 * is both simpler and correct at any section length.
 *
 * A posting with no recognisable headings yields a single `body` block. That is intentional:
 * scoring still works, and the specificity weighting below is what keeps boilerplate in check.
 */
export function segmentJob(jobText: string, policy: AtsEnginePolicy): JobSection[] {
  const km = policy.keywordMatch;
  const matchers: HeadingMatchers<JobSectionKind> = {
    kinds: [
      { kind: "required", re: policyRegex(km.sections.required, "i") },
      { kind: "preferred", re: policyRegex(km.sections.preferred, "i") },
      { kind: "responsibilities", re: policyRegex(km.sections.responsibilities, "i") },
      { kind: "excluded", re: policyRegex(km.sections.excluded, "i") },
    ],
    connector: headingConnector(policy.resumeParse),
  };

  const sections: JobSection[] = [];
  let current: JobSection = { kind: "body", text: "" };

  for (const rawLine of jobText.split(/\r?\n/)) {
    const line = rawLine.trim();
    // A heading is a short standalone line. Requiring that shape stops a requirement written as
    // prose ("...you will be responsible for...") from re-labelling everything after it.
    const heading = classifyHeading(line, matchers);
    if (!heading) {
      current.text += `${line}\n`;
      continue;
    }
    if (current.text.trim()) sections.push(current);
    current = { kind: heading.kind, text: heading.rest ? `${heading.rest}\n` : "" };
  }
  if (current.text.trim()) sections.push(current);

  return sections;
}
