import type { AtsEnginePolicy } from "../policy/schema.js";

export type ResumeSectionKind = "experience" | "education" | "skills" | "projects" | "other";

export type ResumeSection = { kind: ResumeSectionKind; lines: string[] };

/**
 * A line that reads as a section heading rather than body copy: short, and not punctuated like
 * a sentence. Deliberately generous on width (up to eight words) so real-world variants —
 * "Professional Experience", "Core Technical Competencies" — still register, while prose that
 * merely mentions the word ("8 years of experience in education technology") does not.
 */
export function isHeadingLine(line: string) {
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
export function segmentResume(lines: string[], policy: AtsEnginePolicy): ResumeSection[] {
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
