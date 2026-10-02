import { formatParsedDate } from "../format/index.js";
import type { AtsParsedDate, AtsParsedRole } from "../types.js";
import { NO_FINDING, type Finding } from "./finding.js";

/**
 * Dates in the work history that cannot all be true, as a recruiter's eye or an ATS's filter
 * would catch them:
 * - a role that starts after today — usually a typo for a year, sometimes an offer not started;
 * - more than two roles held at once, for more than three months — one job's end date wrong,
 *   most often; an adviser or a freelancer can hold three, which is why it is a note, not a fault;
 * - a career longer than a working life — a start year mistyped by a decade or more.
 *
 * A gap between roles is deliberately not one: it is no error, and flagging it would mark down
 * carers and the ill for something no ATS filters on.
 */

const MAX_CONCURRENT = 2;
const MIN_OVERLAP_MONTHS = 3;
const MAX_CAREER_MONTHS = 50 * 12;

const monthIndex = (date: AtsParsedDate, edge: "start" | "end") =>
  date.year * 12 + (date.month ?? (edge === "start" ? 1 : 12)) - 1;

/**
 * A role's last month for counting overlaps. A year with no month ends in January here, not
 * December: "2017 - 2020" then "2020 - 2024" is one job handed to the next within 2020, and
 * reading both as covering all of 2020 made every such career "overlap" for a year.
 */
const overlapEnd = (date: AtsParsedDate) =>
  date.month === null ? date.year * 12 : monthIndex(date, "end");

export function timelineIssues(
  roles: AtsParsedRole[],
  monthsOfExperience: number | null,
  now: Date,
): Finding | null {
  // With no dated role there are no dates to be wrong: the rule is dropped, not passed.
  if (!roles.some((role) => role.start)) return null;
  const today = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const issues: string[] = [];

  for (const role of roles)
    if (role.start && monthIndex(role.start, "start") > today + 1)
      issues.push(
        `${role.title || "a role"} starts in ${formatParsedDate(role.start)}, after today`,
      );

  // Months covered by more than two roles at once, counted with a sweep over role spans.
  const spans = roles
    .filter((role): role is AtsParsedRole & { start: AtsParsedDate } => role.start !== null)
    // A role with no end that is not current spans its start month, as `monthsOfExperience`
    // counts it: read as running to today, three dated starts "overlapped" for a decade.
    .map((role) => {
      const from = monthIndex(role.start, "start");
      return [from, role.current ? today : role.end ? overlapEnd(role.end) : from];
    })
    .filter(([from, to]) => to >= from);
  // Bounded by a working life, so a mistyped 1950 start costs 600 steps, not a century of them.
  const earliest = spans.length ? Math.min(...spans.map(([from]) => from)) : today + 1;
  const last = Math.min(today, earliest + MAX_CAREER_MONTHS);
  let crowded = 0;
  let firstCrowded = -1;
  for (let month = earliest; month <= last; month += 1) {
    const held = spans.filter(([from, to]) => from <= month && month <= to).length;
    if (held <= MAX_CONCURRENT) continue;
    crowded += 1;
    if (firstCrowded < 0) firstCrowded = month;
  }
  if (crowded >= MIN_OVERLAP_MONTHS) {
    const year = Math.floor(firstCrowded / 12);
    issues.push(`more than ${MAX_CONCURRENT} roles overlap from ${year}`);
  }

  if (monthsOfExperience !== null && monthsOfExperience > MAX_CAREER_MONTHS)
    issues.push(
      `${Math.round(monthsOfExperience / 12)} years of experience is longer than a career`,
    );

  return issues.length ? { value: issues.length, sample: issues[0] } : NO_FINDING;
}
