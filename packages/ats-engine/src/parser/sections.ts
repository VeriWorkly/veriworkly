import type { AtsEnginePolicy } from "../policy/schema.js";
import { policyRegex } from "../policy/regex.js";
import { memo } from "../util/memo.js";

export type ResumeSectionKind = "experience" | "education" | "skills" | "projects" | "other";

/** `headed`: opened by a heading, as opposed to the lines above the first one. */
export type ResumeSection = { kind: ResumeSectionKind; lines: string[]; headed: boolean };

/**
 * A line that reads as a section heading rather than body copy: short, and not punctuated like
 * a sentence. Deliberately generous on width (up to eight words) so real-world variants —
 * "Professional Experience", "Core Technical Competencies" — still register, while prose that
 * merely mentions the word ("8 years of experience in education technology") does not.
 */
export function isHeadingLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  // "।" (danda) ends a sentence in Hindi as "." does in English.
  if (/[.,;।]$/u.test(trimmed)) return false;
  return trimmed.split(/\s+/).length <= 8;
}

/**
 * The section a line opens, if it is a heading, and any content written after a colon on it.
 *
 * Shared by the resume and job segmenters so both read headings the same way. A pattern
 * matching the start of the line is not enough on its own:
 * - "Skills: Python, Java" is a heading *and* content — the part after the colon is kept.
 * - "History of Art BA" and "Experienced Python developer" start like a heading but continue as
 *   prose, so whatever follows the match must be empty or read as more title words:
 *   capitalised ("Work Experience Summary") or a connector ("Skills & Tools").
 * - "Education Program Manager, Khan Academy" is capitalised throughout but is a role: a comma
 *   or a digit after the match rules a heading out.
 */
export function classifyHeading<K>(
  line: string,
  matchers: HeadingMatchers<K>,
): { kind: K; rest: string } | null {
  const colon = line.indexOf(":");
  const head = (colon === -1 ? line : line.slice(0, colon)).trim();
  if (!isHeadingLine(head)) return null;

  for (const { kind, re } of matchers.kinds) {
    const match = re.exec(head);
    const tail = match && head.slice(match.index + match[0].length);
    if (tail === null || !isTitleTail(tail, head, matchers.connector)) continue;
    return { kind, rest: colon === -1 ? "" : line.slice(colon + 1).trim() };
  }
  return null;
}

/** The section patterns, and the policy's `headingConnectors` as one whole-word test. */
export type HeadingMatchers<K> = {
  kinds: ReadonlyArray<{ kind: K; re: RegExp }>;
  connector: RegExp;
};

/** `headingConnectors` as a test of one whole word, symbols ("&", "/") included. */
export const headingConnector = memo(
  (rp: AtsEnginePolicy["resumeParse"]) =>
    new RegExp(`^(?:[&/+|-]+|${rp.headingConnectors.join("|")})$`, "iu"),
);

function isTitleTail(tail: string, head: string, connector: RegExp) {
  // The match ended mid-word: "Experience|d", or a Devanagari word whose vowel sign follows.
  if (/^[\p{L}\p{M}\p{N}]/u.test(tail)) return false;
  // A heading names a section; it has no employer after a comma and no dates. Those are what a
  // role line carries, and "Education Coordinator, Acme  2019 - Present" is one. A count in
  // brackets is the heading's own — "Experience (10+ Years)" — unless it is a year.
  if (tail.includes(",") || /\p{N}/u.test(tail.replace(/\([^()]*\)/g, ""))) return false;
  if (/(?<!\p{N})(?:19|20)\p{N}{2}(?!\p{N})/u.test(tail)) return false;
  // An all-lowercase heading carries no capitalisation signal, so its tail cannot be judged.
  if (!/\p{Lu}/u.test(head)) return true;
  // A heading is in title case ("Skills & Tools") or sentence case ("Education and
  // certifications"); a capitalised word after a lowercase one is prose: "History of Art BA",
  // "Experience in Python".
  const words = tail.trim().split(/\s+/).filter(Boolean);
  return (
    words.every((word) => connector.test(word) || /^[\p{Lu}\p{N}(]/u.test(word)) ||
    words.every((word) => !/^\p{Lu}/u.test(word))
  );
}

type SectionMatchers = HeadingMatchers<ResumeSectionKind>;

const matchersOf = memo((rp: AtsEnginePolicy["resumeParse"]): SectionMatchers => ({
  kinds: [
    { kind: "experience", re: policyRegex(rp.sections.experience, "i") },
    { kind: "education", re: policyRegex(rp.sections.education, "i") },
    { kind: "skills", re: policyRegex(rp.sections.skills, "i") },
    { kind: "projects", re: policyRegex(rp.sections.projects, "i") },
    { kind: "other", re: policyRegex(rp.sections.other, "i") },
  ],
  connector: headingConnector(rp),
}));

const sectionMatchers = (policy: AtsEnginePolicy) => matchersOf(policy.resumeParse);

/** Whether the line is one of the policy's section headings. */
export function isSectionHeading(line: string, policy: AtsEnginePolicy) {
  return classifyHeading(line, sectionMatchers(policy)) !== null;
}

/**
 * Whether the line is a section heading and nothing more — "experience", "skills: Go" — rather
 * than one that only opens with a heading word. A lowercase line carries no capitalisation to
 * tell "education" the heading from "education technology" ending a wrapped sentence, so only
 * the bare word is certain.
 */
export function isBareSectionHeading(line: string, policy: AtsEnginePolicy) {
  const colon = line.indexOf(":");
  const head = (colon === -1 ? line : line.slice(0, colon)).trim();
  return (
    isSectionHeading(line, policy) &&
    sectionMatchers(policy).kinds.some(({ re }) => re.exec(head)?.[0].length === head.length)
  );
}

/** The kinds of section a resume has a heading for: exactly the ones `segmentResume` opened. */
export function headedKinds(sections: readonly ResumeSection[]) {
  return new Set(sections.filter((section) => section.headed).map((section) => section.kind));
}

const LETTERS = /^\p{L}+$/u;

/**
 * A letter-spaced line read back as words, or null when the line is not one.
 *
 * Heading tracking — the wide letter spacing design templates put on "EXPERIENCE" — extracts as
 * one word per glyph, because PDF text has no words, only positioned glyphs, and an extractor
 * calls any gap wider than a fraction of the font size a space. Measured on react-pdf output,
 * pdf.js, Poppler and PDFBox all split above about 0.06em. Two shapes come out:
 * - Wide tracking splits every glyph: "E X P E R I E N C E", with kerned pairs ("AT") left
 *   joined. Recognised by shape alone — every fragment one or two letters, nearly all one — which
 *   leaves initials ("J R R Tolkien") alone.
 * - Tracking near the threshold splits only some pairs: "SU MMARY", "WOR K EXPE RIENCE". That is
 *   also exactly what an ordinary all-caps line ("JANE DOE") looks like, so it is read back only
 *   when the result is a section heading and the line as written is not.
 *
 * Either way the word gaps are usually lost too — the space glyph extracts as one more single
 * space — so "WORKEXPERIENCE" is cut at the fragment gap that makes it a heading. Runs of two or more
 * spaces, where an extractor kept them, are taken as the word gaps they are.
 */
function despace(line: string, matchers: SectionMatchers): string | null {
  if (line.length > 80) return null;
  const fragments = line.split(/\s+/);
  if (fragments.length < 2 || !fragments.every((fragment) => LETTERS.test(fragment))) return null;

  const singles = fragments.filter((fragment) => fragment.length === 1).length;
  const glyphPerWord =
    fragments.length >= 4 &&
    fragments.every((fragment) => fragment.length <= 2) &&
    singles / fragments.length >= 0.75;
  if (!glyphPerWord && (line !== line.toUpperCase() || classifyHeading(line, matchers)))
    return null;

  const words = line.split(/\s{2,}/).map((word) => word.replace(/\s+/g, ""));
  const joined = words.join(" ");
  if (classifyHeading(joined, matchers)) return joined;
  // The lost word gap is one of the gaps the extractor printed, never inside a fragment: cut
  // anywhere, "SKILL SET" read as "SKILLS ET" and "LANGUAGE SKILLS" as "LANGUAGES KILLS".
  let cut = 0;
  if (words.length === 1)
    for (const fragment of fragments.slice(0, -1)) {
      cut += fragment.length;
      const split = `${joined.slice(0, cut)} ${joined.slice(cut)}`;
      if (classifyHeading(split, matchers)) return split;
    }
  return glyphPerWord ? joined : null;
}

/**
 * The resume's lines with letter-spaced ones read back as words, and how many there were.
 *
 * Run before anything reads the lines, so the heading, the parser and the content rules all see
 * "EXPERIENCE". The count is reported separately because recovering the heading is this
 * parser's generosity, not every ATS's: one that keeps the spaces files the whole section under
 * no heading at all, and that is worth a warning even though the report itself reads fine.
 */
export function despaceLines(lines: string[], policy: AtsEnginePolicy) {
  const matchers = sectionMatchers(policy);
  let spaced = 0;
  const read = lines.map((line) => {
    const despaced = despace(line.trim(), matchers);
    if (despaced === null) return line;
    spaced += 1;
    return despaced;
  });
  return { lines: read, spaced };
}

/**
 * Splits the resume at its headings.
 *
 * Every heading terminates the previous block, including headings we do not classify —
 * "Certifications", "Awards", "Publications". Without that, a certifications list sitting below
 * the last job would be read as part of the work history and every line in it examined for a
 * date range.
 *
 * Except inside Skills: there "Languages: TypeScript, Go" is a category of skills, not the
 * Languages section, so a heading word with content after its colon stays a skills line. A bare
 * "Languages" on its own line still opens a section.
 */
export function segmentResume(lines: string[], policy: AtsEnginePolicy): ResumeSection[] {
  const matchers = sectionMatchers(policy);

  const sections: ResumeSection[] = [];
  let current: ResumeSection = { kind: "other", lines: [], headed: false };

  for (const line of lines) {
    const heading = classifyHeading(line, matchers);
    if (!heading || (current.kind === "skills" && heading.rest && heading.kind !== "skills")) {
      current.lines.push(line);
      continue;
    }
    if (current.headed || current.lines.length) sections.push(current);
    current = { kind: heading.kind, lines: heading.rest ? [heading.rest] : [], headed: true };
  }
  // An empty section is kept: its heading was still found.
  if (current.headed || current.lines.length) sections.push(current);

  return sections;
}
