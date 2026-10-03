import { describe, expect, it } from "vitest";

import { DEFAULT_POLICY } from "../src/index.js";
import { BUILT_IN_LOCALES, localizePolicy, withLocales } from "../src/locales/index.js";
import { normalizeText } from "../src/text/text.js";
import { findDateRange } from "../src/parser/dates.js";
import { isSectionHeading, segmentResume } from "../src/parser/sections.js";

/**
 * Properties checked over generated input rather than hand-picked examples. A seeded generator,
 * so a failure reproduces exactly; the seed and the case are in the failure message.
 */

function generator(seed: number) {
  let state = seed;
  const next = () => (state = (state * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648;
  return {
    int: (low: number, high: number) => low + Math.floor(next() * (high - low + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)] as T,
  };
}

const NOW = new Date("2026-09-30T00:00:00Z");
const RUNS = 500;

describe("normalizeText", () => {
  // What PDFs and word processors leave in text: ligatures, fullwidth and Indic digits, no-break
  // spaces, zero-width characters, decomposed accents, tag characters, a byte-order mark.
  const PIECES = [
    "ﬁ",
    "ﬂ",
    "Ａ",
    "１",
    "२",
    "٣",
    "\u{00A0}",
    "\u{200B}",
    "\u{2060}",
    "e\u{0301}",
    "\u{E0041}",
    "\u{FEFF}",
    "Ü",
    "ß",
    "क़",
    " ",
    "\n",
    "a",
    "Z",
    "-",
    "–",
    "@",
    "1",
    "İ",
  ];

  it("is idempotent", () => {
    const random = generator(1);
    for (let run = 0; run < RUNS; run += 1) {
      const text = Array.from({ length: random.int(0, 30) }, () => random.pick(PIECES)).join("");
      const once = normalizeText(text);
      expect(normalizeText(once), JSON.stringify(text)).toBe(once);
    }
  });

  it("leaves only ASCII decimal digits", () => {
    const random = generator(2);
    for (let run = 0; run < RUNS; run += 1) {
      const text = Array.from({ length: random.int(1, 20) }, () => random.pick(PIECES)).join("");
      for (const digit of normalizeText(text).match(/\p{Nd}/gu) ?? [])
        expect(digit, JSON.stringify(text)).toMatch(/[0-9]/);
    }
  });
});

describe("date ranges", () => {
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const FULL = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  const us = DEFAULT_POLICY.resumeParse;
  const de = localizePolicy(withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES), "", { region: "DE" })
    .policy.resumeParse;

  // Every spelling of (year, month) a resume uses, with the policy it is written for.
  const spellings = (year: number, month: number, day: number) =>
    [
      [`${MONTHS[month - 1]} ${year}`, us],
      [`${MONTHS[month - 1]}. ${year}`, us],
      [`${FULL[month - 1]} ${year}`, us],
      [`${pad(month)}/${year}`, us],
      [`${year}-${pad(month)}`, us],
      [`${pad(month)}/${pad(day)}/${year}`, us],
      [`${pad(day)}.${pad(month)}.${year}`, de],
      [`${year}-${pad(month)}-${pad(day)}`, us],
    ] as const;

  it("reads both ends of a range in every spelling, with any separator", () => {
    const random = generator(3);
    for (let run = 0; run < RUNS; run += 1) {
      const [startYear, startMonth] = [random.int(1960, 2020), random.int(1, 12)];
      const [endYear, endMonth] = [random.int(startYear + 1, 2026), random.int(1, 12)];
      const day = random.int(13, 28); // over 12, so a numeric date has one reading
      const [start, policy] = random.pick(spellings(startYear, startMonth, day));
      const end = random.pick(spellings(endYear, endMonth, day).filter(([, p]) => p === policy))[0];
      // A bare hyphen after a numeric date ("2004-07-2019") reads as one longer date, so it
      // only joins two spelled ones: "Jan 2019-Feb 2020".
      const named = /\p{L}/u.test(start) && /\p{L}/u.test(end);
      const separator = random.pick([" - ", "–", " — ", " to ", ...(named ? ["-"] : [])]);
      const line = `Engineer, Acme ${start}${separator}${end}`;

      const found = findDateRange(line, policy, NOW);
      expect(found?.range, line).toEqual({
        start: { year: startYear, month: startMonth },
        end: { year: endYear, month: endMonth },
        current: false,
      });
    }
  });

  it("never reads a range out of a word glued to a year", () => {
    const random = generator(4);
    const WORDS = ["Novartis", "Marketing", "Decathlon", "Octopus", "Junction", "Augusta", "Mayo"];
    for (let run = 0; run < RUNS; run += 1) {
      const [year, end] = [random.int(1960, 2020), random.int(2021, 2026)];
      const line = `Engineer, ${random.pick(WORDS)} ${year} - ${end}`;
      expect(findDateRange(line, us, NOW)?.range.start, line).toEqual({ year, month: null });
    }
  });
});

describe("segmentation", () => {
  const BODY = [
    "Led a team of five engineers",
    "Built the billing service in Go",
    "Python, Go, Kubernetes",
    "University of Washington, B.S. 2014",
    "Senior Engineer, Acme 2019 - 2022",
    "Reduced costs by 30%",
  ];
  const HEADINGS = ["Experience", "Education", "Skills", "Projects", "Certifications", "Summary"];

  it("keeps every body line exactly once, in order", () => {
    const random = generator(5);
    for (let run = 0; run < RUNS; run += 1) {
      const lines = Array.from({ length: random.int(0, 25) }, () =>
        random.pick([...BODY, ...BODY, ...HEADINGS]),
      );
      const kept = segmentResume(lines, DEFAULT_POLICY).flatMap((section) => section.lines);
      expect(kept, JSON.stringify(lines)).toEqual(
        lines.filter((line) => !isSectionHeading(line, DEFAULT_POLICY)),
      );
    }
  });
});
