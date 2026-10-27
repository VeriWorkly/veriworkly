import { join } from "node:path";
import { createRequire } from "node:module";

import { createElement } from "react";
import { Document, Font, Page, Text, pdf } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";

import type { BaseDocument } from "@/features/documents/core/types";

import {
  FONT_IDS,
  FONT_REGISTRY,
  getPdfFontStack,
  type FontFamilyId,
} from "@/features/documents/constants/fonts";
import {
  cleanResumeText,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";
import {
  describeUndrawablePdfText,
  findTextPdfCannotDraw,
  findUndrawableCharacters,
  needsLastResortPdfFont,
} from "@/features/documents/export/pdf-unsupported-text";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { PDF_GLYPH_COVERAGE } from "@/templates/pdf/glyph-coverage";
import { layoutPages, registerPdfTestFonts, resolveLayoutEngine } from "@/tests/utils/pdf";
import { loadTemplatePdfComponentById } from "@/templates/resume/pdf";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";

/**
 * What the export can actually draw.
 *
 * A character the embedded fonts have no glyph for does not fail loudly — it
 * resolves to `.notdef`, which has zero width and no ink. The preview hides
 * this completely, because a browser is free to borrow a face from the reader's
 * system when the CSS stack runs out; a PDF only contains what it embeds. So a
 * name renders perfectly on screen and is simply absent from the download.
 *
 * `hasGlyphForCodePoint` is the wrong way to check this: it says Geist cannot
 * draw "ễ", yet the shaper composes it from a base letter and two combining
 * marks and the output is fine. Only laying the text out tells the truth, so
 * that is what these tests do.
 */

const require_ = createRequire(import.meta.url);
const fromRenderer = createRequire(require_.resolve("@react-pdf/renderer"));
const fontkit = fromRenderer("fontkit") as {
  openSync: (path: string) => { characterSet: number[] };
};

interface Glyph {
  name?: string;
}
interface Node {
  type?: string;
  lines?: { runs?: { glyphs?: Glyph[] }[] }[];
  children?: Node[];
}

/** Scripts a resume written in English is expected to contain. */
const SUPPORTED = {
  latin: "The quick brown fox jumps over the lazy dog",
  latinAccents: "José Müller-Nagy Łukasz Świątek François Şahin Ñuñez Gülşah Çelik",
  vietnamese: "Nguyễn Thị Hương kỹ sư phần mềm",
  greek: "Γεώργιος Παπαδόπουλος μηχανικός",
  cyrillic: "Александр Петров инженер",
  punctuation: "£ $ € ¥ ₹ — – “ ” ‘ ’ … • ½ © ® § ¶ † ‡",
  bullet: "•",
  symbols: "⇒ ₩ ₺ ₦ ₱ ₫ ฿ ∆",
};

/**
 * Emoji as people type them: presentation-default pictographs, a flag, a hand with a skin
 * tone, a ZWJ family, emoji-styled hearts and letters, a keycap, dingbats no family draws —
 * beside the ©, ® and ™ every family does draw.
 */
const EMOJI_LINE = "Shipped 🚀 the ⭐ launch 🇺🇸 🫶 🅰 ❤️ 👍🏽 👨‍👩‍👧 ✔ ★ ☎ ⌘ © ® ™ 1️⃣";

/** Scripts no embedded family covers. Tracked, not silently accepted. */
const UNSUPPORTED = {
  japanese: "山田太郎 分散システム",
  chinese: "分布式系统架构师",
  korean: "분산 시스템 아키텍트",
  arabic: "مهندس برمجيات",
  hebrew: "מהנדס תוכנה",
  devanagari: "सॉफ़्टवेयर इंजीनियर",
  thai: "วิศวกรซอฟต์แวร์",
};

function countBlanks(node: Node, acc = { total: 0, blank: 0 }) {
  for (const line of node.lines ?? []) {
    for (const run of line.runs ?? []) {
      for (const glyph of run.glyphs ?? []) {
        if (glyph.name === "space") continue;
        acc.total += 1;
        if (glyph.name === ".notdef") acc.blank += 1;
      }
    }
  }

  for (const child of node.children ?? []) countBlanks(child, acc);
  return acc;
}

/**
 * The stack with the last-resort family, which a template adds whenever the document needs
 * it (`needsLastResortPdfFont`; checked through real templates below).
 */
async function blanksFor(fontId: FontFamilyId, text: string) {
  const element = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: [595, 842], style: { padding: 20 } },
      createElement(
        Text,
        { style: { fontFamily: getPdfFontStack(fontId, true), fontSize: 14 } },
        text,
      ),
    ),
  );

  const instance = pdf(element as never) as unknown as {
    container: { document: Node };
    toBuffer: () => Promise<unknown>;
  };

  await instance.toBuffer();
  return countBlanks(await resolveLayoutEngine<Node>()(instance.container.document, Font));
}

describe("the PDF can draw every script the editor is meant to accept", () => {
  beforeAll(() => {
    registerPdfTestFonts();
  });

  for (const fontId of FONT_IDS) {
    for (const [script, text] of Object.entries(SUPPORTED)) {
      it(`${fontId} draws ${script}`, async () => {
        const { total, blank } = await blanksFor(fontId, text);

        expect(total).toBeGreaterThan(0);
        expect(
          blank,
          `${fontId} leaves ${blank} of ${total} characters blank in "${text}". ` +
            `Its stack is [${getPdfFontStack(fontId, true).join(", ")}] — add a family that covers ` +
            `this script to \`pdfFallbackIds\`.`,
        ).toBe(0);
      }, 60_000);
    }
  }

  /**
   * No embedded family has emoji, so the render model strips them before either renderer
   * sees the text. What is left must draw completely: no flag letter, skin tone, joiner or
   * variation selector may survive as a blank.
   */
  for (const fontId of FONT_IDS) {
    it(`S-109: ${fontId} draws a line typed with emoji once they are stripped`, async () => {
      const cleaned = cleanResumeText(EMOJI_LINE);
      const { total, blank } = await blanksFor(fontId, cleaned);

      expect(cleaned).toBe("Shipped the launch © ® ™ 1");
      expect(total).toBeGreaterThan(0);
      expect(blank, `${fontId} leaves ${blank} blank in "${cleaned}"`).toBe(0);
    }, 60_000);
  }

  /**
   * Records the limitation instead of pretending it away.
   *
   * Supporting these needs a CJK-capable family embedded, which is several
   * megabytes; until then the editor accepts the text and the export drops it.
   * Written to fail the day coverage arrives, so it cannot outlive its cause.
   */
  for (const [script, text] of Object.entries(UNSUPPORTED)) {
    it(`no font draws ${script} — it exports blank`, async () => {
      const results = await Promise.all(FONT_IDS.map((id) => blanksFor(id, text)));

      expect(
        results.every((r) => r.blank === r.total && r.total > 0),
        `a font gained ${script} coverage: move it to SUPPORTED and drop this case`,
      ).toBe(true);
    }, 60_000);
  }

  /**
   * S-288: the export warns before it drops characters, from a table of what each family
   * holds. The warning is only as good as that table, so it is held to the layout: the
   * check must call a sample blank exactly when react-pdf draws `.notdef` for it.
   */
  for (const fontId of FONT_IDS) {
    for (const [script, text] of Object.entries({ ...SUPPORTED, ...UNSUPPORTED })) {
      it(`S-288: the export check agrees with the layout on ${script} in ${fontId}`, async () => {
        const { blank } = await blanksFor(fontId, text);
        const flagged = findUndrawableCharacters(text, fontId);

        expect(flagged.length > 0, `flagged [${flagged.join(" ")}], layout blank ${blank}`).toBe(
          blank > 0,
        );
      }, 60_000);
    }
  }
});

/** Code points both weights of a family hold, as the hex ranges `glyph-coverage.ts` stores. */
function coverageOf(family: string): string {
  const entry = Object.values(FONT_REGISTRY).find((font) => font.primaryFamily === family)!;
  const [regular, ...others] = entry.pdfFonts.map(
    (face) => new Set(fontkit.openSync(join(process.cwd(), "public", face.src)).characterSet),
  );
  const points = [...regular].filter((point) => others.every((set) => set.has(point)));
  const ranges: [number, number][] = [];

  for (const point of points.sort((a, b) => a - b)) {
    const last = ranges.at(-1);
    if (last && last[1] === point - 1) last[1] = point;
    else ranges.push([point, point]);
  }

  return ranges
    .map(([start, end]) =>
      start === end ? start.toString(16) : `${start.toString(16)}-${end.toString(16)}`,
    )
    .join(" ");
}

describe("S-288: the export warns before the PDF drops characters", () => {
  it("S-288: the coverage table matches the font files", () => {
    for (const font of Object.values(FONT_REGISTRY)) {
      expect(
        PDF_GLYPH_COVERAGE[font.primaryFamily],
        `regenerate templates/pdf/glyph-coverage.ts for ${font.primaryFamily}`,
      ).toBe(coverageOf(font.primaryFamily));
    }
  });

  it("S-288: names the resume fields that would print blank, and only printed ones", () => {
    const resume = structuredClone(defaultResume);
    resume.basics.fullName = "山田太郎";
    resume.summary = "सॉफ़्टवेयर इंजीनियर";
    resume.experience[0].company = "مهندس";
    resume.sections = resume.sections.map((section) =>
      section.id === "experience" ? { ...section, visible: false } : section,
    );

    const found = findTextPdfCannotDraw({ type: "RESUME", content: resume } as BaseDocument);

    expect(found.map((entry) => entry.field)).toEqual(["Name", "Summary"]);
    expect(found[0].characters).toEqual(["山", "田", "太", "郎"]);
    expect(describeUndrawablePdfText(found)).toMatch(
      /^These characters will be blank in the PDF: Name \(山 田 太 郎\), Summary \(.+\)\. Use DOCX or HTML, or remove them\.$/,
    );
  });

  it("S-288: names the cover letter fields that would print blank", () => {
    const content = structuredClone(createDefaultCoverLetter("s-288").content);
    content.senderName = "Kim 김민준";
    content.body = "שלום";

    const found = findTextPdfCannotDraw({ type: "COVER_LETTER", content } as BaseDocument);

    expect(found.map((entry) => entry.field)).toEqual(["Name", "Body"]);
  });

  it("S-288: raises nothing for text every family draws", () => {
    const content = structuredClone(defaultResume);

    expect(findTextPdfCannotDraw({ type: "RESUME", content } as BaseDocument)).toEqual([]);
  });
});

describe("S-288: links are judged on the text the PDF prints", () => {
  const withLink = (displayMode: "icon" | "url" | "icon-username", label: string, url: string) => {
    const resume = structuredClone(defaultResume);
    resume.links = {
      displayMode,
      items: [{ id: "l1", type: "portfolio", label, url }],
    };
    return { type: "RESUME", content: resume } as BaseDocument;
  };

  it("S-288: a label the URL mode never prints raises nothing", () => {
    expect(findTextPdfCannotDraw(withLink("url", "我的作品", "https://example.com/work"))).toEqual(
      [],
    );
  });

  it("S-288: an icon-only link prints no text, so raises nothing", () => {
    expect(findTextPdfCannotDraw(withLink("icon", "我的作品", "https://例え.jp/作品"))).toEqual([]);
  });

  it("S-288: a Unicode URL is judged on its printed form", () => {
    const document = withLink("url", "Work", "https://例え.jp/作品");
    const link = (document.content as typeof defaultResume).links.items[0];
    const printed = getLinkDisplayText(link, "url");
    const expected = findUndrawableCharacters(printed, "geist");

    // Printed as punycode and percent-escapes, so nothing in it is left blank.
    expect(printed).toBe("xn--r8jz45g.jp/%E4%BD%9C%E5%93%81");
    const links = findTextPdfCannotDraw(document).find((entry) => entry.field === "Links");

    expect(links?.characters ?? []).toEqual(expected);
  });

  it("S-288: cover letters read the printed link text too", () => {
    const content = structuredClone(createDefaultCoverLetter("s-288").content);
    content.links = {
      displayMode: "url",
      items: [{ id: "l1", type: "portfolio", label: "我的作品", url: "https://example.com" }],
    };

    expect(findTextPdfCannotDraw({ type: "COVER_LETTER", content } as BaseDocument)).toEqual([]);
  });
});

describe("the last-resort PDF family is fetched only when a document needs it", () => {
  const SYMBOLS = "Prices in ₩ and ₺ ⇒ ∆ growth";

  it("a document every chosen family draws does not ask for it", () => {
    for (const fontId of FONT_IDS) {
      const resume = structuredClone(defaultResume);
      resume.customization = { ...resume.customization, fontFamily: fontId };

      expect(needsLastResortPdfFont({ type: "RESUME", content: resume }), fontId).toBe(false);
    }
  });

  it("a resume template draws ⇒ ₩ ₺ ∆ through it, with nothing blank", async () => {
    const resume = structuredClone(defaultResume);
    resume.summary = SYMBOLS;

    expect(needsLastResortPdfFont({ type: "RESUME", content: resume })).toBe(true);

    const Pdf = await loadTemplatePdfComponentById("modern-minimal");
    const pages = await layoutPages(Pdf, { resume: { ...resume, templateId: "modern-minimal" } });
    const counts = pages.reduce((acc, page) => countBlanks(page as unknown as Node, acc), {
      total: 0,
      blank: 0,
    });

    expect(counts.total).toBeGreaterThan(0);
    expect(counts.blank).toBe(0);
  }, 60_000);

  it("a cover letter template draws them too", async () => {
    const content = structuredClone(createDefaultCoverLetter("lr").content);
    content.body = SYMBOLS;

    const Pdf = await coverLetterTemplateRegistry.loadPdf("professional");
    const pages = await layoutPages(Pdf, { content });
    const counts = pages.reduce((acc, page) => countBlanks(page as unknown as Node, acc), {
      total: 0,
      blank: 0,
    });

    expect(counts.blank).toBe(0);
  }, 60_000);
});
