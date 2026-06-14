import type { AtsReport, AtsRuleResult, AtsSeverity } from "#services/atsTypes";

const ACTION_VERBS =
  /\b(achieved|built|created|delivered|designed|developed|drove|grew|improved|increased|launched|led|managed|optimized|reduced|shipped)\b/i;
const METRIC =
  /(?:[$€£]\s?\d[\d,.]*|\b\d+(?:\.\d+)?(?:%|x|k|m|b|\+)\b|\b\d+[\d,.]*\s+(?:customers|projects|requests|revenue|users)\b)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;
const LINK = /https?:\/\/|linkedin\.com|github\.com/i;
const SECTION_PATTERNS = {
  experience: /\b(experience|employment|work history)\b/i,
  education: /\b(education|academic)\b/i,
  skills: /\b(skills|technologies|competencies)\b/i,
};

function flatten(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flatten).join("\n");
  if (value && typeof value === "object")
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key} ${flatten(item)}`)
      .join("\n");
  return "";
}

function result(
  id: string,
  passed: boolean,
  severity: AtsSeverity,
  scoreImpact: number,
  evidence: string,
  fix: string,
): AtsRuleResult {
  return { id, passed, severity, scoreImpact: passed ? 0 : scoreImpact, evidence, fix };
}

function words(text: string) {
  return text.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [];
}

function keywordMatch(resume: string, job: string) {
  const stop = new Set([
    "and",
    "are",
    "for",
    "from",
    "have",
    "job",
    "our",
    "that",
    "the",
    "this",
    "with",
    "will",
    "you",
    "your",
  ]);
  const jobWords = [...new Set(words(job).filter((word) => !stop.has(word)))];
  if (!jobWords.length) return null;
  const resumeWords = new Set(words(resume));
  return Math.round(
    (jobWords.filter((word) => resumeWords.has(word)).length / jobWords.length) * 100,
  );
}

export class AtsScoringService {
  static extractText(resume: unknown) {
    return flatten(resume).replace(/\s+/g, " ").trim().slice(0, 50_000);
  }

  static check(resume: unknown, jobDescription?: string): AtsReport {
    const text = this.extractText(resume);
    const wordCount = words(text).length;
    const rules = [
      result(
        "ats-v1.parse.text",
        wordCount >= 120,
        "error",
        18,
        `${wordCount} readable words`,
        "Provide a complete text-based resume.",
      ),
      result(
        "ats-v1.contact.email",
        EMAIL.test(text),
        "error",
        5,
        EMAIL.test(text) ? "Email detected" : "No email detected",
        "Add a professional email address.",
      ),
      result(
        "ats-v1.contact.phone",
        PHONE.test(text),
        "warning",
        4,
        PHONE.test(text) ? "Phone detected" : "No phone detected",
        "Add a reachable phone number.",
      ),
      result(
        "ats-v1.contact.link",
        LINK.test(text),
        "info",
        2,
        LINK.test(text) ? "Professional link detected" : "No professional link detected",
        "Add LinkedIn, GitHub, or a portfolio URL.",
      ),
      ...Object.entries(SECTION_PATTERNS).map(([name, pattern]) =>
        result(
          `ats-v1.structure.${name}`,
          pattern.test(text),
          "error",
          6,
          pattern.test(text) ? `${name} section detected` : `${name} section not detected`,
          `Add a clearly labeled ${name} section.`,
        ),
      ),
      result(
        "ats-v1.content.action-verbs",
        ACTION_VERBS.test(text),
        "warning",
        7,
        ACTION_VERBS.test(text) ? "Action-oriented language detected" : "Few action verbs detected",
        "Start achievement bullets with specific action verbs.",
      ),
      result(
        "ats-v1.content.metrics",
        METRIC.test(text),
        "warning",
        9,
        METRIC.test(text) ? "Measurable evidence detected" : "No measurable evidence detected",
        "Add numbers, percentages, scope, or outcomes.",
      ),
      result(
        "ats-v1.length",
        wordCount >= 250 && wordCount <= 1_200,
        "warning",
        6,
        `${wordCount} words`,
        "Keep the resume concise while including enough evidence.",
      ),
      result(
        "ats-v1.format.tables",
        !/[│┌┐└┘]/.test(text),
        "warning",
        5,
        /[│┌┐└┘]/.test(text) ? "Table-like characters detected" : "No table characters detected",
        "Avoid tables and complex columns for ATS compatibility.",
      ),
      result(
        "ats-v1.format.headers",
        !/\b(page \d+ of \d+)\b/i.test(text),
        "info",
        2,
        "Header/footer risk check complete",
        "Remove repeated page headers and footers.",
      ),
    ];
    const readinessScore = Math.max(
      0,
      100 - rules.reduce((sum, rule) => sum + rule.scoreImpact, 0),
    );
    const jobMatchScore = jobDescription?.trim() ? keywordMatch(text, jobDescription) : null;
    const failedChecks = rules.filter((rule) => !rule.passed);
    const strengths = rules
      .filter((rule) => rule.passed)
      .slice(0, 5)
      .map((rule) => rule.evidence);

    return {
      version: "ats-v1",
      readinessScore,
      jobMatchScore,
      parsingWarnings: rules
        .filter((rule) => !rule.passed && rule.id.includes("parse"))
        .map((rule) => rule.evidence),
      strengths,
      failedChecks,
      prioritizedFixes: [...failedChecks]
        .sort((a, b) => b.scoreImpact - a.scoreImpact)
        .slice(0, 6)
        .map((rule) => rule.fix),
      rules,
    };
  }
}
