import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedRole } from "../types.js";
import { findDateRange } from "./dates.js";
import { isHeadingLine } from "./sections.js";

export const BULLET = /^[-•*◦▪–—·]/;

/**
 * Splits a role header into a job title and an employer.
 *
 * Resumes write this both ways round — "Staff Engineer, Acme" and "Acme — Staff Engineer" — so
 * the side carrying a recognisable job-title word decides, rather than the position. When
 * neither side looks like a title the first is taken as the title, which is the more common
 * order; the field is still reported, and the completeness check below is what tells the
 * candidate the pair was ambiguous.
 */
export function splitTitleAndEmployer(header: string, policy: AtsEnginePolicy) {
  const cleaned = header
    .replace(BULLET, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[|,\-–—\s]+|[|,\-–—\s]+$/g, "");

  if (!cleaned) return { title: "", employer: "" };

  const parts = cleaned
    .split(/\s+[|·•]\s+|\s+[–—]\s+|,\s+|\s+\bat\b\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1) return { title: parts[0], employer: "" };

  const titleWords = new RegExp(`\\b(?:${policy.resumeParse.titleWords.join("|")})\\b`, "i");
  const titleIndex = parts.findIndex((part) => titleWords.test(part));

  if (titleIndex === -1) return { title: parts[0], employer: parts.slice(1).join(", ") };

  const employer = parts.filter((_, index) => index !== titleIndex).join(", ");
  return { title: parts[titleIndex], employer };
}

/**
 * Recovers one row per job.
 *
 * A date range anchors each entry, because that is the one element every work-history block has
 * and the one an ATS needs in order to compute tenure at all. The title and employer are then
 * read from the same line, or from the line immediately above when the resume puts the dates on
 * their own line — both layouts are common.
 */
export function parseRoles(lines: string[], policy: AtsEnginePolicy): AtsParsedRole[] {
  const roles: AtsParsedRole[] = [];

  lines.forEach((line, index) => {
    const found = findDateRange(line, policy.resumeParse);
    if (!found) return;

    const remainder = line.replace(found.matched, " ").trim();
    const previous = index > 0 ? lines[index - 1] : "";

    // A date line on its own carries no title; the header is the line above it, as long as that
    // line is a header rather than another bullet of the previous job.
    const headerSource =
      remainder.replace(/[^A-Za-z]/g, "").length >= 3
        ? remainder
        : !BULLET.test(previous) && isHeadingLine(previous)
          ? previous
          : "";

    const { title, employer } = splitTitleAndEmployer(headerSource, policy);
    roles.push({ ...found.range, title, employer });
  });

  return roles;
}
