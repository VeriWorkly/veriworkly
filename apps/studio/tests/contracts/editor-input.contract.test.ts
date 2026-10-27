import { afterEach, describe, expect, it, vi } from "vitest";

import type { MasterProfileData } from "@/types/resume";

import { createEmptyMasterProfile } from "@veriworkly/profile-core";

import { canRetryWithSameRequestId, createRequestId, getAiActions } from "@/features/ai/ai-api";
import { coverLetterAiContext, resumeAiContext } from "@/features/ai/ai-context";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { ApiRequestError } from "@/utils/fetchApiData";
import { joinDelimited, parseDelimited } from "@/features/documents/editor/form";
import {
  emptyCustomSection,
  sectionRowKey,
  setLinkByType,
  withCustomSectionRows,
} from "@/features/profile/components/master/master-utils";

const fetchApiDataMock = vi.hoisted(() => vi.fn());

vi.mock("@/utils/fetchApiData", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/fetchApiData")>()),
  fetchApiData: fetchApiDataMock,
}));

// `form` pulls in the UI kit, whose font loader only runs inside a Next build.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

/**
 * The pure halves of the editor input fixes. The typing behaviour itself is covered in
 * `tests/browser/editor-behavior.test.ts`; these pin the parsing and the profile edits the
 * components route through.
 */

describe("list field parsing (S-058, S-059)", () => {
  it("keeps a sentence with commas as one newline-delimited item", () => {
    expect(parseDelimited("Cut costs 30%, saving $2M\nShipped v2", "newline")).toEqual([
      "Cut costs 30%, saving $2M",
      "Shipped v2",
    ]);
  });

  it("round-trips newline items that contain commas", () => {
    const items = ["x, y", "z"];

    expect(parseDelimited(joinDelimited(items, "newline"), "newline")).toEqual(items);
  });

  it("splits keywords on commas and on newlines", () => {
    expect(parseDelimited("a, b\nc,", "comma")).toEqual(["a", "b", "c"]);
  });

  it("drops blank entries and trims each one", () => {
    expect(parseDelimited("  a  \n\n  b ", "newline")).toEqual(["a", "b"]);
  });
});

describe("master profile link fields (S-078)", () => {
  const links: MasterProfileData["links"] = { displayMode: "icon", items: [] };

  it("adds a link of the typed type when none exists", () => {
    const next = setLinkByType(links, "github", "https://github.com/me");

    expect(next.items).toHaveLength(1);
    expect(next.items[0]).toMatchObject({ type: "github", url: "https://github.com/me" });
  });

  it("updates the existing link of that type without touching the others", () => {
    const withTwo = setLinkByType(setLinkByType(links, "github", "h"), "linkedin", "l");
    const next = setLinkByType(withTwo, "github", "ht");

    expect(next.items.map((item) => [item.type, item.url])).toEqual([
      ["github", "ht"],
      ["linkedin", "l"],
    ]);
    expect(next.items[0].id).toBe(withTwo.items[0].id);
  });

  it("keeps the raw text while typing, trailing space included", () => {
    expect(setLinkByType(links, "portfolio", "https://me.dev ").items[0].url).toBe(
      "https://me.dev ",
    );
  });

  it("removes the link when the field is cleared", () => {
    const next = setLinkByType(setLinkByType(links, "github", "h"), "github", "");

    expect(next.items).toEqual([]);
  });
});

describe("master profile custom section visibility (S-091)", () => {
  const base = createEmptyMasterProfile();

  function customRows(profile: MasterProfileData) {
    return profile.sections.filter((section) => section.id === "custom");
  }

  it("leaves an already-consistent profile untouched", () => {
    expect(withCustomSectionRows(base)).toBe(base);
  });

  it("gives every added custom section its own row", () => {
    const added = emptyCustomSection();
    const next = withCustomSectionRows({
      ...base,
      customSections: [...base.customSections, added],
    });

    expect(customRows(next).map((row) => row.customSectionId)).toEqual([
      base.customSections[0].id,
      added.id,
    ]);
    expect(new Set(next.sections.map(sectionRowKey)).size).toBe(next.sections.length);
  });

  it("drops the row of a removed custom section and duplicate rows", () => {
    const row = customRows(base)[0];
    const next = withCustomSectionRows({
      ...base,
      sections: [...base.sections, { ...row }, { ...row, customSectionId: "gone" }],
    });

    expect(customRows(next)).toEqual([row]);
  });

  it("lets a row without customSectionId keep its visibility for the first section", () => {
    const sections = base.sections.map((section) =>
      section.id === "custom"
        ? { id: section.id, label: section.label, order: section.order, visible: false }
        : section,
    );
    const next = withCustomSectionRows({ ...base, sections });

    expect(customRows(next)).toEqual([
      expect.objectContaining({ visible: false, customSectionId: base.customSections[0].id }),
    ]);
  });
});

describe("AI request ids (S-168)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("still produces an id where crypto.randomUUID is missing (plain-HTTP self-host)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const id = createRequestId();

    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(createRequestId()).not.toBe(id);
  });
});

describe("AI request id reuse after a failure (S-172)", () => {
  it("keeps the id when the server never answered", () => {
    expect(canRetryWithSameRequestId(new TypeError("Failed to fetch"))).toBe(true);
    expect(canRetryWithSameRequestId(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(canRetryWithSameRequestId(new DOMException("timed out", "TimeoutError"))).toBe(true);
  });

  it("drops the id once the server answered with an error", () => {
    // 502: provider failed and the reservation was released, so the id can never be reused.
    expect(canRetryWithSameRequestId(new ApiRequestError("Provider failed", 502))).toBe(false);
    expect(
      canRetryWithSameRequestId(new ApiRequestError("This AI request already completed.", 409)),
    ).toBe(false);
    expect(canRetryWithSameRequestId(new ApiRequestError("Not enough AI credits.", 402))).toBe(
      false,
    );
  });

  it("drops the id for anything else it cannot classify", () => {
    expect(canRetryWithSameRequestId(new SyntaxError("Unexpected token"))).toBe(false);
  });
});

describe("AI pricing failure is retryable (S-066)", () => {
  it("does not cache a failed /ai/actions call, so Retry fetches again", async () => {
    const costs = { standard: 2, expert: 5 };

    fetchApiDataMock
      .mockRejectedValueOnce(new ApiRequestError("AI service is down", 500))
      .mockResolvedValueOnce({ rewrite_section: { costs } });

    await expect(getAiActions()).rejects.toThrow("AI service is down");
    await expect(getAiActions()).resolves.toEqual({ rewrite_section: { costs } });
    expect(fetchApiDataMock).toHaveBeenCalledTimes(2);
  });
});

describe("AI context sends what the text is about, not who wrote it (S-313)", () => {
  const resume = structuredClone(defaultResume);
  resume.basics = {
    ...resume.basics,
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+442079460958",
    location: "London",
  };

  const letter = {
    ...createDefaultCoverLetter("ai-context").content,
    senderName: "Ada Lovelace",
    senderEmail: "ada@example.com",
    senderPhone: "+442079460958",
    senderLocation: "London",
    jobTitle: "Analytical Engineer",
    body: "The body is sent as the request text.",
    jobPost: "The job post is also context.",
  };

  it("leaves contact details, the body and layout out of the context", () => {
    for (const context of [
      JSON.stringify(resumeAiContext(resume)),
      coverLetterAiContext(letter, resume),
    ]) {
      expect(context).not.toMatch(/Ada Lovelace|ada@example\.com|442079460958|London/);
      expect(context).not.toMatch(/sent as the|fontFamily|accentColor/);
    }
  });

  it("grounds a letter in the role it targets and the chosen resume", () => {
    const context = JSON.parse(coverLetterAiContext(letter, resume));

    expect(context.targetRole).toBe("Analytical Engineer");
    // Also in the context: the server's prompt template may not read `jobDescription`.
    expect(context.jobPost).toBe("The job post is also context.");
    expect(context.resume.experience[0].role).toBe(resume.experience[0].role);
    expect(JSON.parse(coverLetterAiContext(letter, null)).resume).toBeUndefined();
  });
});
