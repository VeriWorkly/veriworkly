import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  formatParsedDate,
  formatRoleDates,
  formatTenure,
  roleSpanMonths,
  scoreTone,
  sortByCategoryOrder,
} from "../src/format/index.js";

describe("format helpers", () => {
  it("bands scores for display", () => {
    expect([100, 80, 79, 55, 54, 0].map(scoreTone)).toEqual([
      "good",
      "good",
      "warn",
      "warn",
      "bad",
      "bad",
    ]);
  });

  it("orders known categories and keeps unknown ones after them", () => {
    const sorted = sortByCategoryOrder([
      { category: "custom" },
      { category: "format" },
      { category: "parse" },
    ]);
    expect(sorted.map((item) => item.category)).toEqual(["parse", "format", "custom"]);
    expect(categoryLabel("custom")).toBe("Custom");
    expect(categoryLabel("content")).toBe("Evidence");
  });

  it("formats dates, spans and tenure", () => {
    expect(formatParsedDate({ year: 2021, month: 3 })).toBe("Mar 2021");
    expect(formatParsedDate({ year: 2021, month: null })).toBe("2021");
    expect(formatParsedDate(null)).toBeNull();
    expect(formatRoleDates({ start: { year: 2021, month: 3 }, end: null, current: true })).toBe(
      "Mar 2021 – Present",
    );
    expect(formatRoleDates({ start: null, end: null, current: false })).toBeNull();
    expect(formatTenure(38)).toBe("3 yr 2 mo");
    expect(formatTenure(36)).toBe("3 yr");
    expect(formatTenure(7)).toBe("7 mo");
  });

  it("measures a role span inclusively and generously", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    expect(
      roleSpanMonths(
        { start: { year: 2020, month: 1 }, end: { year: 2020, month: 12 }, current: false },
        now,
      ),
    ).toBe(12);
    expect(
      roleSpanMonths(
        { start: { year: 2020, month: null }, end: { year: 2020, month: null }, current: false },
        now,
      ),
    ).toBe(12);
    expect(roleSpanMonths({ start: { year: 2026, month: 1 }, end: null, current: true }, now)).toBe(
      9,
    );
    expect(roleSpanMonths({ start: null, end: null, current: true }, now)).toBe(0);
  });
});
