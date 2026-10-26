import {
  ISCED_LABELS,
  formatCertification,
  formatRoleDates,
  formatSpokenLanguage,
  formatTenure,
} from "@veriworkly/ats-engine/format";

import { siteConfig } from "@/config/site";

import { categoryMeta, sortByCategoryOrder } from "../data/categories";
import { REQUIREMENT_STATUS_LABELS, sortRequirements } from "../data/requirements";
import type { AtsFullReport, AtsParsedResume, AtsRuleResult } from "../types";

function heading(lines: string[], title: string) {
  lines.push("----------------------------------------");
  lines.push(title);
  lines.push("----------------------------------------");
}

function parsedLines(parsed: AtsParsedResume): string[] {
  const lines = [
    `Name: ${parsed.name || "not found"}`,
    `Email: ${parsed.email || "not found"}`,
    `Phone: ${parsed.phone || "not found"}`,
  ];
  if (parsed.links.length) lines.push(`Links: ${parsed.links.join(", ")}`);

  lines.push(
    `Work history (${parsed.roles.length} ${parsed.roles.length === 1 ? "row" : "rows"}):`,
  );
  for (const role of parsed.roles) {
    const dates = formatRoleDates(role);
    lines.push(
      `- ${role.title || "no title"} | ${role.employer || "no employer"} | ${dates ?? "no dates"}`,
    );
  }
  if (parsed.monthsOfExperience !== null)
    lines.push(`Total experience: ${formatTenure(parsed.monthsOfExperience)}`);

  lines.push(`Education (${parsed.education.length}):`);
  for (const entry of parsed.education) {
    const name = [entry.credential, entry.school].filter(Boolean).join(", ") || "Entry";
    lines.push(`- ${name}${entry.end ? ` (${entry.end.year})` : ""}`);
  }
  if (parsed.highestIsced) lines.push(`Highest level: ${ISCED_LABELS[parsed.highestIsced]}`);

  lines.push(`Skills (${parsed.skills.length}): ${parsed.skills.join(", ") || "none"}`);
  if (parsed.certifications.length)
    lines.push(`Certifications: ${parsed.certifications.map(formatCertification).join("; ")}`);
  if (parsed.spokenLanguages.length)
    lines.push(`Languages: ${parsed.spokenLanguages.map(formatSpokenLanguage).join(", ")}`);
  return lines;
}

export function reportToPlainText(report: AtsFullReport, siteUrl: string = siteConfig.url): string {
  const lines: string[] = [];

  lines.push("========================================");
  lines.push("VERIWORKLY ATS RESUME READINESS REPORT");
  lines.push("========================================");
  lines.push("");
  lines.push(`ATS Readiness: ${report.readinessScore}/100`);

  if (report.jobMatchScore !== null) {
    lines.push(`Job Match: ${report.jobMatchScore}/100`);
  } else {
    lines.push("Job match: not scored (no job description provided)");
  }

  lines.push(`Verdict: ${report.verdict}`);
  lines.push("");

  if (report.parsingWarnings.length > 0) {
    heading(lines, "PARSING WARNINGS");
    for (const warning of report.parsingWarnings) lines.push(`! ${warning}`);
    lines.push("");
  }

  if (report.categories.length > 0) {
    lines.push("----------------------------------------");
    lines.push("CATEGORY BREAKDOWN");
    lines.push("----------------------------------------");
    const sortedCategories = sortByCategoryOrder(report.categories);
    for (const cat of sortedCategories) {
      const meta = categoryMeta(cat.category);
      lines.push(`- ${meta.label}: ${cat.score}% (${cat.passed}/${cat.total} checks)`);
    }
    lines.push("");
  }

  if (report.failedChecks.length > 0) {
    lines.push("----------------------------------------");
    lines.push("FIX THESE FIRST");
    lines.push("----------------------------------------");

    const sortedFixes = [...report.failedChecks].sort(
      (a: AtsRuleResult, b: AtsRuleResult) => b.scoreImpact - a.scoreImpact,
    );

    sortedFixes.forEach((check, index) => {
      lines.push(`${index + 1}. ${check.fix}`);
      lines.push(`   Why: ${check.evidence}`);
      lines.push(`   Worth: ${check.scoreImpact} points`);
    });
    lines.push("");
  }

  if (report.requirements.length > 0) {
    heading(lines, "REQUIREMENT BY REQUIREMENT");
    for (const requirement of sortRequirements(report.requirements)) {
      const label = REQUIREMENT_STATUS_LABELS[requirement.status];
      const preferred = requirement.importance === "preferred" ? ", nice to have" : "";
      lines.push(`[${label}${preferred}] ${requirement.text}`);
      if (requirement.detail) lines.push(`   ${requirement.detail}`);
      for (const line of requirement.evidence) lines.push(`   Evidence: ${line}`);
    }
    lines.push("");
  }

  heading(lines, "WHAT THE ATS SEES");
  lines.push(...parsedLines(report.parsed));
  lines.push("");

  if (report.strengths.length > 0) {
    lines.push("----------------------------------------");
    lines.push("ALREADY WORKING");
    lines.push("----------------------------------------");
    for (const strength of report.strengths) {
      lines.push(`* ${strength}`);
    }
    lines.push("");
  }

  if (report.jobMatchScore !== null) {
    lines.push("----------------------------------------");
    lines.push("KEYWORDS");
    lines.push("----------------------------------------");

    const matched = report.matchedKeywords.length > 0 ? report.matchedKeywords.join(", ") : "none";
    lines.push(`Matched: ${matched}`);

    const hard = report.missingKeywordGroups.hard;
    lines.push(`Missing: ${hard.length > 0 ? hard.join(", ") : "none"}`);
    const soft = report.missingKeywordGroups.soft;
    if (soft.length > 0) lines.push(`Soft skills mentioned (weigh less): ${soft.join(", ")}`);
    lines.push("");
  }

  if (report.advice.length > 0) {
    lines.push("----------------------------------------");
    lines.push("WORTH KNOWING (NOT SCORED)");
    lines.push("----------------------------------------");
    for (const item of report.advice) {
      lines.push(`* ${item.message}`);
      if (item.fix) lines.push(`  ${item.fix}`);
    }
    lines.push("");
  }

  lines.push("========================================");
  lines.push(`Generated by ${siteUrl}/ats-checker`);
  lines.push("========================================");

  return lines.join("\n");
}
