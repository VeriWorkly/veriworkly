import {
  copiedPosting,
  homoglyphWords,
  injectionPhrases,
  stuffedTerms,
} from "../checks/integrity/text.js";
import { unsupportedSkills } from "../checks/skills.js";
import { timelineIssues } from "../checks/timeline.js";
import { parseResumeDocument } from "../document/parse.js";
import type { PreparedResume } from "../input.js";
import { BULLET, wordListRegex, words } from "../text/text.js";
import { statesDateOfBirth } from "../parser/contact.js";
import { parseQuality, parseReadLines } from "../parser/index.js";
import { readResumeLines } from "../parser/lines.js";
import {
  headedKinds,
  isHeadingLine,
  segmentResume,
  type ResumeSection,
} from "../parser/sections.js";
import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsLayoutSignals, AtsParsedResume } from "../types.js";
import { memo } from "../util/memo.js";
import type { RuleContext } from "./rules.js";

/**
 * Lines that carry substantive content, which both ratio metrics divide by.
 *
 * On a resume written in bullets, that is the bullets: they are what "open each bullet with a
 * verb" and "quantify outcomes" are about, and counting the lines around them too — headers,
 * contact rows, a summary — graded a resume on how many of those it had. A two-line PDF header
 * row was enough to flip the verb check on an otherwise identical resume.
 *
 * Without bullets (prose, or a list whose markers did not survive extraction) it falls back to
 * full sentences: lines naming a content verb or running to four words, as opposed to headings,
 * short skill tags and layout debris. The verb list comes from `policy.text.contentLineVerbs`,
 * so a policy in another language brings its own.
 */
const MIN_BULLETS = 3;
const contentLineTest = memo((text: AtsEnginePolicy["text"]) => {
  const verbs = wordListRegex(text.contentLineVerbs);
  return (line: string) => verbs.test(line) || line.split(/\s+/).length >= 4;
});

function contentLinesOf(lines: string[], policy: AtsEnginePolicy) {
  const bullets = lines.filter((line) => BULLET.test(line));
  return bullets.length >= MIN_BULLETS ? bullets : lines.filter(contentLineTest(policy.text));
}

export type ReadResume = {
  ctx: RuleContext;
  lines: string[];
  sections: ResumeSection[];
  parsed: AtsParsedResume;
};

/**
 * Everything the rules read about one resume, read once.
 *
 * The lines are read before anything else sees them — wrapped lines rejoined, letter-spaced ones
 * read back — and segmented once, so the word count, the parser, the heading rules, the skills
 * check and the requirements all agree on what a line and a section are. The same pass gives the
 * report's recovered fields: a structured document is read from its fields, text is parsed.
 */
export function readResume(
  prepared: PreparedResume,
  policy: AtsEnginePolicy,
  {
    jobDescription,
    layout,
    now,
  }: { jobDescription?: string; layout?: AtsLayoutSignals; now: Date },
): ReadResume {
  const { lines, spaced } = readResumeLines(prepared.text.split(/\n+/), policy);
  const sections = segmentResume(lines, policy);
  const text = lines.join(" ").replace(/\s+/g, " ").trim();
  const parsed = prepared.document
    ? parseResumeDocument(prepared.document, policy, now)
    : parseReadLines(lines, policy, now, sections);

  const ctx: RuleContext = {
    text,
    wordCount: words(text).length,
    lines,
    headingLines: lines.filter(isHeadingLine),
    contact: { email: parsed.email, phone: parsed.phone },
    sections: headedKinds(sections),
    contentLines: contentLinesOf(lines, policy),
    letterSpacedLines: spaced,
    layout,
    quality: {
      ...parseQuality(parsed),
      dateOfBirthStated: Number(statesDateOfBirth(lines, policy)),
    },
    findings: {
      injectionPhrases: injectionPhrases(
        text,
        // Text no reader sees: smuggled in tag characters, or in the file's metadata.
        [prepared.hidden.smuggled, layout?.metadataText ?? ""].join("\n"),
        policy,
      ),
      invisibleCharacters: {
        value: prepared.hidden.count,
        sample: prepared.hidden.smuggled.slice(0, 80),
      },
      homoglyphWords: homoglyphWords(text),
      copiedPostingRatio: jobDescription?.trim() ? copiedPosting(text, jobDescription) : null,
      stuffedTerms: stuffedTerms(text, lines, policy, now),
      timelineIssues: timelineIssues(parsed.roles, parsed.monthsOfExperience, now),
      unsupportedSkills: unsupportedSkills(sections, parsed.skills),
    },
    policy,
  };
  return { ctx, lines, sections, parsed };
}
