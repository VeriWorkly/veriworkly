import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedRole } from "../types.js";
import { BULLET, BULLET_PREFIX, wordListPattern, wordListRegex } from "../text/text.js";
import { findDateRange } from "./dates.js";
import { isHeadingLine } from "./sections.js";
import { memo } from "../util/memo.js";

type HeaderMatchers = { titleWords: RegExp; splitter: RegExp; verbOpener: RegExp };

const matchersOf = memo(({ resumeParse: rp, text }: AtsEnginePolicy): HeaderMatchers => ({
  titleWords: wordListRegex(rp.titleWords),
  // Split before collapsing whitespace: a tab or a run of spaces is a column gap between
  // title and employer, and collapsing it first merged the two into one field. The words
  // that join a title to its employer ("Engineer at Acme", "Entwickler bei Acme") are data; an
  // "@" standing alone ("Data Scientist @ Netflix") is the symbol for them, and spaced so an
  // email address is never cut.
  splitter: new RegExp(
    String.raw`\s*[|·•]\s*|\s+[-–—@]\s+|\t+|\s{2,}|,\s+|\s+${wordListPattern(rp.employerWords)}\s+`,
    "iu",
  ),
  verbOpener: new RegExp(`^${wordListPattern(text.contentLineVerbs)}`, "iu"),
}));

function headerParts(header: string, policy: AtsEnginePolicy) {
  // Empty brackets are what is left of "(Jan 2020 - Present)" once the dates are taken out. A
  // leading "." is kept when a word follows it: ".NET Developer".
  return header
    .replace(BULLET_PREFIX, "")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .split(matchersOf(policy).splitter)
    .map((part) =>
      // The trailing run is matched from its first character only: unanchored, a long run of
      // separators would be retried from every position in it.
      part
        .replace(/\s+/g, " ")
        .replace(/^(?:[\s|,\-–—]|\.(?![\p{L}\p{N}]))+|(?<![\s|,.\-–—])[\s|,.\-–—]+$/gu, ""),
    )
    .filter(Boolean);
}

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
  const parts = headerParts(header, policy);

  if (parts.length === 0) return { title: "", employer: "" };
  if (parts.length === 1) return { title: parts[0], employer: "" };

  const { titleWords } = matchersOf(policy);
  const titleIndex = parts.findIndex((part) => titleWords.test(part));

  if (titleIndex === -1) return { title: parts[0], employer: parts.slice(1).join(", ") };

  const employer = parts.filter((_, index) => index !== titleIndex).join(", ");
  return { title: parts[titleIndex], employer };
}

/**
 * Recovers one row per job.
 *
 * A date range anchors each entry, because that is the one element every work-history block has
 * and the one an ATS needs in order to compute tenure at all. The title and employer are read
 * from the same line; failing that from the line above — or the two lines above, when title and
 * employer are stacked — and failing that from the line below, for resumes that print dates
 * first.
 *
 * When the dated line holds only one half — "Founder & Developer 2025-01 - Present" with
 * "VeriWorkly | Remote" under it, or "Acme Corporation" over it — the other half is read from
 * the neighbouring line. Only its first part is taken: the employer, not the "Remote" or city
 * after it.
 *
 * Bullet lines are never role anchors. A bullet describes work inside a role, and the numbers in
 * one ("grew revenue 2019 - 2021", "from 1000 to 5000 users") are achievements, not tenure.
 */
export function parseRoles(
  lines: string[],
  policy: AtsEnginePolicy,
  now: Date = new Date(),
): AtsParsedRole[] {
  const roles: AtsParsedRole[] = [];

  const rp = policy.resumeParse;
  const { verbOpener: opensWithVerb, titleWords } = matchersOf(policy);
  // A header is a short, unbulleted line with no dates of its own. A trailing full stop does not
  // make "Senior Engineer, Acme Corp." a sentence.
  const isHeader = (line: string | undefined): line is string =>
    line !== undefined &&
    !BULLET.test(line) &&
    isHeadingLine(line.replace(/\.$/, "")) &&
    !findDateRange(line, rp, now);
  const isSingle = (line: string) => splitTitleAndEmployer(line, policy).employer === "";
  const lettersIn = (text: string) => text.match(/\p{L}/gu)?.length ?? 0;

  // Every dated line, with the header text it carries itself.
  const anchors = lines.flatMap((line, index) => {
    const found = BULLET.test(line) ? null : findDateRange(line, rp, now);
    if (!found) return [];
    const remainder = line.replace(found.matched, " ").trim();
    return [{ index, found, own: lettersIn(remainder) >= 3 ? remainder : "" }];
  });
  const ownAt = new Map(anchors.map((anchor) => [anchor.index, anchor.own]));

  // Lines already read into a role's header, so one employer line never serves two roles.
  const used = new Set<number>();
  const take = (at: number) => {
    used.add(at);
    return lines[at];
  };
  const free = (at: number) => !used.has(at) && isHeader(lines[at]);

  // The half of a header a dated line lacks, read from the line at `at`. A short description
  // line without a bullet ("Led the platform team") is header-shaped too; opening with an
  // action verb is what gives it away. The line below a role is not free when it is the header
  // of the next role, whose dated line, two down, carries none of its own.
  const halfAt = (at: number, from: number) => {
    if (!free(at) || opensWithVerb.test(lines[at])) return null;
    if (at > from && ownAt.get(at + 1) === "") return null;
    return headerParts(lines[at], policy)[0] ?? null;
  };

  // Resumes repeat one layout for every role, so which side holds the missing half is decided
  // once, by the roles where only one side could. Asked per role, "above" would take a short
  // unbulleted closing line of the previous role as the next role's employer.
  const halves = anchors.filter((anchor) => anchor.own && isSingle(anchor.own));
  const aboveVotes = halves.filter((a) => halfAt(a.index - 1, a.index)).length;
  const belowVotes = halves.filter((a) => halfAt(a.index + 1, a.index)).length;
  const sides = belowVotes > aboveVotes ? [1, -1] : [-1, 1];

  const titled = (at: number) => titleWords.test(lines[at] ?? "");
  // A neighbour that is a whole header on its own: a title and an employer, "Founder - Acme".
  const whole = (at: number, from: number) =>
    halfAt(at, from) !== null && !isSingle(lines[at]) && titled(at);

  for (const { index, found, own } of anchors) {
    let header = own;
    if (own && isSingle(own)) {
      // "Founder & Developer - VeriWorkly" over "2025-01 - Present | Remote": the neighbour is
      // the header, and what the dated line carries besides its dates is where, not who.
      const full = titled(index) ? undefined : sides.find((offset) => whole(index + offset, index));
      const side = full ?? sides.find((offset) => halfAt(index + offset, index));
      if (full !== undefined) header = take(index + full);
      else if (side !== undefined)
        header = `${own} | ${headerParts(take(index + side), policy)[0]}`;
    }
    // Stacked above a bare date line: "Engineer" over "Acme", or a title over "Acme, Munich" —
    // the line two up is the title when it holds one and the line above does not. Only the first
    // part of the employer line is the employer; the rest is where.
    const stacked = (above: number) =>
      free(above - 1) &&
      isSingle(lines[above - 1]) &&
      (isSingle(lines[above]) || (titled(above - 1) && !titled(above)));
    if (!header && free(index - 1))
      header = stacked(index - 1)
        ? `${take(index - 2)} | ${headerParts(take(index - 1), policy)[0]}`
        : take(index - 1);
    if (!header && free(index + 1)) header = take(index + 1);

    const { title, employer } = splitTitleAndEmployer(header, policy);
    roles.push({ ...found.range, title, employer });
  }

  return roles;
}

/** The policy's job-title words, compiled once. */
export function titleWordsOf(policy: AtsEnginePolicy) {
  return matchersOf(policy).titleWords;
}
