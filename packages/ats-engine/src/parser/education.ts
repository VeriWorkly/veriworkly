import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsDegreeLevel, AtsParsedEducation } from "../types.js";
import { findDateRange } from "./dates.js";

const DEGREE_ORDER: AtsDegreeLevel[] = ["diploma", "associate", "bachelor", "master", "doctorate"];

export function parseEducation(lines: string[], policy: AtsEnginePolicy): AtsParsedEducation[] {
  const { degrees, schoolWords } = policy.resumeParse;
  const schools = new RegExp(`\\b(?:${schoolWords.join("|")})\\b`, "i");
  const levels = Object.entries(degrees).map(([level, pattern]) => ({
    level: level as AtsDegreeLevel,
    re: new RegExp(pattern, "i"),
  }));

  const entries: AtsParsedEducation[] = [];

  for (const line of lines) {
    const matchedLevel = levels.find(({ re }) => re.test(line));
    const isSchool = schools.test(line);
    if (!matchedLevel && !isSchool) continue;

    const range = findDateRange(line, policy.resumeParse);
    const credential = matchedLevel ? (line.match(matchedLevel.re)?.[0] ?? "").trim() : "";

    // The date range comes out before the institution is read, otherwise it rides along on the
    // end of the school name — an entry reading "University of California - 2014 - 2018" is not
    // the employer-equivalent field a recruiter would search on.
    const withoutDates = range ? line.replace(range.matched, " ") : line;
    const school = isSchool
      ? (withoutDates
          .split(/[|,•·]|\s+[–—-]\s+/)
          .map((part) => part.trim().replace(/[\s,–—-]+$/, ""))
          .find((part) => schools.test(part)) ?? "")
      : "";

    entries.push({
      school,
      credential,
      level: matchedLevel?.level ?? null,
      end: range?.range.end ?? null,
    });
  }

  return entries;
}

export function highestDegree(entries: AtsParsedEducation[]) {
  let best: AtsDegreeLevel | null = null;
  for (const entry of entries) {
    if (!entry.level) continue;
    if (!best || DEGREE_ORDER.indexOf(entry.level) > DEGREE_ORDER.indexOf(best)) best = entry.level;
  }
  return best;
}
