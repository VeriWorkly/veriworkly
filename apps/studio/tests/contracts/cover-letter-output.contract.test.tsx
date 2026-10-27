import { renderToStaticMarkup } from "react-dom/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import { extractResume } from "@veriworkly/ats-engine/node";

import type { CoverLetterContent, CoverLetterSectionId } from "@/features/cover-letter/types";

import { createDefaultCoverLetter, createEmptyCoverLetter } from "@/features/cover-letter/defaults";
import { parseCoverLetterMarkdown } from "@/features/cover-letter/markdown-import";
import { parseCoverLetterContent } from "@/features/cover-letter/schema";
import { buildCoverLetterDocx } from "@/features/documents/export/docx/document-docx";
import { pxToPt } from "@/features/resume/constants/resume-layout";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import {
  buildCoverLetterMarkdown,
  buildCoverLetterText,
  buildProfessionalFlowItems,
  buildVeriworklyFlowItems,
  getCoverLetterState,
} from "@/templates/cover-letter/shared";
import { buildCoverLetterHtml } from "@/templates/cover-letter/web";
import { veriworklyRailOverflows } from "@/templates/cover-letter/shared";
import { createCoverLetterPdfElement } from "@/templates/cover-letter/pdf";
import { registerPdfTestFonts } from "@/tests/utils/pdf";
import { docxPageSize, unzipDocx } from "@/tests/utils/docx";
import { PAPER_SIZES, getPageGeometry } from "@/templates/shared/page-geometry";

import { layoutPages, type LayoutNode } from "../parity/pdf-layout";
import { ptToPx } from "../parity/geometry";

const TEMPLATE_IDS = coverLetterTemplateRegistry.ids;

const WORDS_80 = Array.from({ length: 80 }, (_, index) => `word${index}`).join(" ");

const GITHUB = {
  id: "github",
  type: "github" as const,
  label: "GitHub",
  url: "https://github.com/ada",
};

function letter(
  overrides: Partial<CoverLetterContent> = {},
  appearance: Partial<CoverLetterContent["appearance"]> = {},
): CoverLetterContent {
  const base = createDefaultCoverLetter("cover-letter-output").content;

  return {
    ...base,
    date: "January 1, 2026",
    links: { displayMode: "icon-username", items: [GITHUB] },
    ...overrides,
    appearance: { ...base.appearance, ...appearance },
  };
}

function hiding(...sections: CoverLetterSectionId[]) {
  return { hiddenSections: sections };
}

async function docxText(content: CoverLetterContent) {
  const files = await unzipDocx(await buildCoverLetterDocx(content));

  return (files.get("word/document.xml") ?? "").replace(/<[^>]+>/g, " ");
}

async function allOutputs(content: CoverLetterContent) {
  const outputs: [string, string][] = [
    ["markdown", buildCoverLetterMarkdown(content)],
    ["text", buildCoverLetterText(content)],
    ["docx", await docxText(content)],
  ];

  for (const templateId of TEMPLATE_IDS) {
    const Preview = await coverLetterTemplateRegistry.loadWeb(templateId);

    outputs.push([`${templateId} html`, await buildCoverLetterHtml(content, templateId)]);
    outputs.push([`${templateId} preview`, renderToStaticMarkup(<Preview content={content} />)]);
  }

  return outputs;
}

describe("a paragraph is one paragraph in every renderer (S-026)", () => {
  const content = letter({ opening: WORDS_80, postscript: WORDS_80 });

  it("keeps an 80-word paragraph as one flow item in both flows", () => {
    const { flow } = getCoverLetterState(content);

    for (const items of [buildProfessionalFlowItems(flow), buildVeriworklyFlowItems(flow)]) {
      const paragraphs = items.filter(
        (item) => item.type === "paragraph" && item.text.includes("word0"),
      );

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0]).toMatchObject({ text: WORDS_80 });
    }
  });

  it("prints the paragraph whole and a single P.S. in every output", async () => {
    for (const [name, output] of await allOutputs(content)) {
      expect(output, `${name} prints the paragraph unbroken`).toContain(WORDS_80);
      // A preview renders only its measuring probe until the first measure lays out pages.
      expect(output.match(/P\.S\./g), `${name} prints one "P.S."`).toHaveLength(1);
    }
  });
});

describe("phone numbers print the way people write them (S-289)", () => {
  it("spaces a stored E.164 sender phone in every output", async () => {
    const content = letter({ senderPhone: "+442079460958" });

    for (const [name, output] of await allOutputs(content)) {
      expect(output, name).toContain("+44 20 7946 0958");
      expect(output, name).not.toContain("+442079460958");
    }
  });
});

describe("hidden sections stay hidden in every export (S-029, S-101, S-107)", () => {
  it("prints no profile, target, link or letter text when all four are hidden", async () => {
    const content = letter(
      { signature: "Alexandra M. Morgan", closing: "Warm regards," },
      hiding("profile", "target", "links", "letter"),
    );
    const hidden = [
      content.senderEmail,
      content.senderPhone,
      content.recipientName,
      content.recipientTitle,
      content.companyName,
      content.subject,
      "github.com/ada",
      content.greeting,
      content.closing,
      content.signature,
      "P.S.",
    ];

    for (const [name, output] of await allOutputs(content)) {
      for (const value of hidden) {
        expect(output, `${name} must not print "${value}"`).not.toContain(value);
      }
    }
  });

  it("drops the signature with a hidden letter (S-107)", async () => {
    const content = letter({ signature: "Alexandra M. Morgan" }, hiding("letter"));

    for (const [name, output] of await allOutputs(content)) {
      expect(output, name).not.toContain("Alexandra M. Morgan");
    }
  });

  it("does not print a hidden signature in place of a missing name (S-107)", async () => {
    const content = letter({ senderName: "", signature: "Alexandra M. Morgan" }, hiding("letter"));

    for (const [name, output] of await allOutputs(content)) {
      expect(output, name).not.toContain("Alexandra M. Morgan");
    }
  });
});

describe("no placeholder reaches an output (S-028, S-108)", () => {
  const PLACEHOLDERS = [
    /Role or professional title/,
    /\bApplication\b/,
    /Open role/,
    /Your Name/,
    /Additional Information/,
  ];

  it("prints nothing in place of an empty name, title, subject or role", async () => {
    const content = letter({
      senderName: "",
      senderTitle: "",
      signature: "",
      subject: "",
      jobTitle: "",
    });

    for (const [name, output] of await allOutputs(content)) {
      for (const placeholder of PLACEHOLDERS) {
        expect(output, `${name} must not print ${placeholder}`).not.toMatch(placeholder);
      }
    }
  });

  it("omits the letter itself from a blank letter", async () => {
    const content = { ...createEmptyCoverLetter("blank").content, date: "" };

    expect(buildCoverLetterMarkdown(content)).toBe("");
    expect(buildCoverLetterText(content)).toBe("");
  });
});

describe("the HTML export describes the shared page and cannot be styled from data", () => {
  it("uses the shared page geometry and never clips (S-030)", async () => {
    for (const templateId of TEMPLATE_IDS) {
      const html = await buildCoverLetterHtml(letter(), templateId);

      expect(html, templateId).toContain(`width:${getPageGeometry("a4").widthPx}px`);
      expect(html, templateId).toContain(`min-height:${getPageGeometry("a4").heightPx}px`);
      expect(html, templateId).not.toContain("1123px");
      expect(html, templateId).not.toContain("overflow:hidden");
    }
  });

  it("refuses a colour that would break out of the stylesheet (S-031)", async () => {
    const attack = "x}</style><script>alert(1)</script>";
    const content = letter(
      {},
      { pageColor: attack, textColor: attack, accentColor: attack, sidebarColor: attack },
    );

    for (const templateId of TEMPLATE_IDS) {
      const html = await buildCoverLetterHtml(content, templateId);

      expect(html, templateId).not.toContain("<script");
      expect(html, templateId).not.toContain(attack);
    }

    const parsed = parseCoverLetterContent({
      appearance: { pageColor: attack, textColor: "#ABC", accentColor: "red", sidebarColor: 4 },
    });

    expect(parsed.appearance).toMatchObject({
      pageColor: "#ffffff",
      textColor: "#ABC",
      accentColor: "#2563eb",
      sidebarColor: "#f8fafc",
    });
  });
});

describe("the Word export (S-101, S-174)", () => {
  it("links are hyperlinks and the file names its title and author", async () => {
    const files = await unzipDocx(await buildCoverLetterDocx(letter()));

    expect(files.get("word/document.xml")).toContain("<w:hyperlink");
    expect(files.get("word/_rels/document.xml.rels")).toContain('Target="https://github.com/ada"');
    expect(files.get("docProps/core.xml")).toContain(
      "<dc:title>Alex Morgan - Cover Letter</dc:title>",
    );
    expect(files.get("docProps/core.xml")).toContain("<dc:creator>Alex Morgan</dc:creator>");
  });
});

describe("the Markdown export reads back as the same letter (S-128)", () => {
  const other = letter({
    senderName: "Somebody Else",
    senderTitle: "Other Title",
    senderEmail: "other@example.com",
    recipientName: "Other Recipient",
    greeting: "Hello there,",
    opening: "Other opening.",
    body: "Other body.",
    highlights: "- Other highlight",
    closing: "Cheers,",
    signature: "Other Signature",
    postscript: "Other postscript.",
  });

  it("recovers every printed field without borrowing from the open letter", () => {
    const original = letter({ senderPhone: "", companyLocation: "" });
    const markdown = buildCoverLetterMarkdown(original);
    const parsed = parseCoverLetterMarkdown(markdown, other);

    expect(parsed).toMatchObject({
      senderName: original.senderName,
      senderTitle: original.senderTitle,
      senderEmail: original.senderEmail,
      senderPhone: "",
      senderLocation: original.senderLocation,
      senderWebsite: original.senderWebsite,
      date: original.date,
      recipientName: original.recipientName,
      recipientTitle: original.recipientTitle,
      companyName: original.companyName,
      companyLocation: "",
      jobTitle: original.jobTitle,
      subject: original.subject,
      greeting: original.greeting,
      opening: original.opening,
      body: original.body,
      highlights: original.highlights,
      closing: original.closing,
      signature: original.signature,
      postscript: original.postscript,
    });
    expect(parsed.links.items).toMatchObject([
      { type: "github", label: "GitHub", url: "https://github.com/ada" },
    ]);
    expect(buildCoverLetterMarkdown(parsed)).toBe(markdown);
  });

  it("still reads an export made before the letterhead was labelled", () => {
    const legacy = [
      "# Alex Morgan",
      "Product Engineer | alex.morgan@example.com | Remote | example.com | github.com/ada",
      "January 1, 2026",
      "Jordan Lee\nEngineering Manager\nAcme Corp",
      "**Subject:** Application for Product Engineer at Acme Corp",
      "Dear Jordan Lee,",
      "I am excited to apply.",
      "I build editors.",
      "- Shipped autosave",
      "Sincerely,",
      "Alex Morgan",
      "P.S. Thanks for reading.",
    ].join("\n\n");

    const parsed = parseCoverLetterMarkdown(legacy, other);

    expect(parsed).toMatchObject({
      senderName: "Alex Morgan",
      senderTitle: "Product Engineer",
      senderEmail: "alex.morgan@example.com",
      senderPhone: "",
      senderLocation: "Remote",
      senderWebsite: "example.com",
      date: "January 1, 2026",
      recipientName: "Jordan Lee",
      recipientTitle: "Engineering Manager",
      companyName: "Acme Corp",
      subject: "Application for Product Engineer at Acme Corp",
      greeting: "Dear Jordan Lee,",
      opening: "I am excited to apply.",
      body: "I build editors.",
      highlights: "- Shipped autosave",
      closing: "Sincerely,",
      signature: "Alex Morgan",
      postscript: "Thanks for reading.",
    });
    expect(parsed.links.items).toMatchObject([{ type: "github", url: "https://github.com/ada" }]);
    expect(
      parseCoverLetterMarkdown("# Your Name\n\nDear team,\n\nHello.\n\nAda", other).senderName,
    ).toBe("");
  });

  it("S-128: keeps the last paragraph in the body when the letter has no sign-off", () => {
    const unsigned = letter({ senderName: "", closing: "", signature: "", postscript: "" });

    expect(parseCoverLetterMarkdown(buildCoverLetterMarkdown(unsigned), other)).toMatchObject({
      body: unsigned.body,
      highlights: unsigned.highlights,
      closing: "",
      signature: "",
    });

    // With a name, the export prints it where the signature goes; the body still stays whole.
    const named = letter({ closing: "", signature: "", postscript: "" });

    expect(parseCoverLetterMarkdown(buildCoverLetterMarkdown(named), other)).toMatchObject({
      body: named.body,
      highlights: named.highlights,
      closing: "",
      signature: named.senderName,
    });
  });

  it("keeps the sender phone in its stored E.164 form through a round trip", () => {
    const original = letter({ senderPhone: "+442079460958" });

    expect(parseCoverLetterMarkdown(buildCoverLetterMarkdown(original), other).senderPhone).toBe(
      "+442079460958",
    );
  });

  it("knows a sign-off by its words, not its punctuation", () => {
    const signed = letter({ closing: "Kind regards", signature: "A. Morgan", postscript: "" });

    expect(parseCoverLetterMarkdown(buildCoverLetterMarkdown(signed), other)).toMatchObject({
      body: signed.body,
      closing: "Kind regards",
      signature: "A. Morgan",
    });

    const unsigned = letter({
      senderName: "",
      body: "First paragraph.\n\nWhat I would bring:",
      highlights: "",
      closing: "",
      signature: "",
      postscript: "",
    });

    expect(parseCoverLetterMarkdown(buildCoverLetterMarkdown(unsigned), other)).toMatchObject({
      body: unsigned.body,
      closing: "",
      signature: "",
    });
  });

  it("takes a greeting only when the letter goes on after it", () => {
    expect(parseCoverLetterMarkdown("Hello, I am applying for the role.", other)).toMatchObject({
      greeting: "",
      opening: "Hello, I am applying for the role.",
    });
  });

  it("reads a greeting written without a comma as the greeting (O4 LOW)", () => {
    const original = letter({ greeting: "Hi team" });
    const parsed = parseCoverLetterMarkdown(buildCoverLetterMarkdown(original), other);

    expect(parsed).toMatchObject({ greeting: "Hi team", opening: original.opening });
  });

  it("imports an empty letter as empty, never as the open letter or a placeholder", () => {
    const empty = { ...createEmptyCoverLetter("empty").content, date: "", senderName: "Ada" };
    const parsed = parseCoverLetterMarkdown(buildCoverLetterMarkdown(empty), other);

    expect(JSON.stringify(parsed)).not.toContain("Your Name");
    expect(parsed).toMatchObject({
      senderName: "Ada",
      senderEmail: "",
      recipientName: "",
      greeting: "",
      opening: "",
      body: "",
      highlights: "",
      postscript: "",
    });
  });
});

function contentBottom(node: LayoutNode, offset = 0): number {
  const top = offset + ptToPx(node.box?.top);
  const bottom = top + ptToPx(node.box?.height);

  return (node.children ?? []).reduce(
    (deepest, child) => Math.max(deepest, contentBottom(child, top)),
    bottom,
  );
}

type TextNode = LayoutNode & {
  lines?: { string?: string; runs?: { glyphs?: { name?: string }[] }[] }[];
};

function collect(node: LayoutNode, into: TextNode[] = []): TextNode[] {
  into.push(node as TextNode);
  for (const child of node.children ?? []) collect(child, into);
  return into;
}

describe("the PDF never drops a long letter off the page (S-027, S-106)", () => {
  const paragraphs = Array.from(
    { length: 10 },
    (_, index) => `Paragraph ${index + 1} opens here. ${WORDS_80} closes paragraph ${index + 1}.`,
  );
  const content = letter(
    {
      body: paragraphs.join("\n\n"),
      highlights: Array.from({ length: 10 }, (_, index) => `- Highlight ${index + 1}`).join("\n"),
      postscript: "The last line of the letter.",
    },
    { pageMargin: 64, lineHeight: 1.8, paragraphSpacing: 20 },
  );

  for (const templateId of TEMPLATE_IDS) {
    it(`${templateId} flows onto further pages and clips nothing`, async () => {
      const Pdf = await coverLetterTemplateRegistry.loadPdf(templateId);
      const pages = await layoutPages(Pdf, { content });

      expect(pages.length).toBeGreaterThan(1);

      for (const [index, page] of pages.entries()) {
        expect(contentBottom(page), `${templateId} page ${index + 1}`).toBeLessThanOrEqual(
          ptToPx(page.box?.height) + 1,
        );
      }

      const printed = pages
        .flatMap((page) => collect(page))
        .flatMap((node) => node.lines ?? [])
        .map((line) => line.string ?? "")
        .join(" ")
        .replace(/\s+/g, " ");

      expect(printed).toContain("closes paragraph 10.");
      expect(printed).toContain("The last line of the letter.");
    }, 60_000);
  }
});

describe("cover-letter text is drawn, never blank (S-033, S-034)", () => {
  it("strips emoji the embedded fonts cannot draw", async () => {
    const content = letter({
      senderName: "Alex 🚀 Morgan",
      senderTitle: "Builder 🚀",
      opening: "Launching 🚀 things.",
      highlights: "- Shipped 🚀 fast",
      postscript: "See you 🚀 soon.",
    });

    for (const templateId of TEMPLATE_IDS) {
      const Pdf = await coverLetterTemplateRegistry.loadPdf(templateId);
      const glyphs = (await layoutPages(Pdf, { content }))
        .flatMap((page) => collect(page))
        .flatMap((node) => node.lines ?? [])
        .flatMap((line) => line.runs ?? [])
        .flatMap((run) => run.glyphs ?? []);

      expect(
        glyphs.filter((glyph) => glyph.name === ".notdef"),
        templateId,
      ).toHaveLength(0);
    }

    for (const [name, output] of await allOutputs(content)) {
      expect(output, name).not.toContain("🚀");
    }
  }, 60_000);

  it("states the executive letter-spacing in points (S-034)", async () => {
    const Pdf = await coverLetterTemplateRegistry.loadPdf("executive");
    const spacings = (await layoutPages(Pdf, { content: letter() }))
      .flatMap((page) => collect(page))
      .map((node) => node.style?.letterSpacing)
      .filter((value): value is number => typeof value === "number" && value > 0);

    expect(spacings).toContain(pxToPt(0.4));
    expect(spacings).not.toContain(0.4);
  });
});

describe("the HTML export draws what the preview draws (S-298, S-302)", () => {
  const withLink = (displayMode: "icon" | "url" | "icon-username") => {
    const content = structuredClone(createDefaultCoverLetter("html").content) as CoverLetterContent;
    content.links = {
      displayMode,
      items: [{ id: "l1", type: "github", label: "GitHub", url: "https://github.com/someone" }],
    };
    return content;
  };

  for (const templateId of coverLetterTemplateRegistry.ids) {
    it(`S-298: ${templateId} wraps long emails and URLs instead of overflowing`, async () => {
      const html = await buildCoverLetterHtml(withLink("url"), templateId);

      expect(html).toMatch(/body\{[^}]*overflow-wrap:anywhere/);
    });

    it(`${templateId} prints an icon-only link as an icon, with its text as the name`, async () => {
      const icon = await buildCoverLetterHtml(withLink("icon"), templateId);
      const both = await buildCoverLetterHtml(withLink("icon-username"), templateId);
      const url = await buildCoverLetterHtml(withLink("url"), templateId);

      expect(icon).toMatch(
        /<a class="icon-link" href="[^"]+" aria-label="GitHub"><svg[^>]*>.*?<\/svg><\/a>/,
      );
      expect(both).toMatch(/<svg[^>]*>.*?<\/svg><span>[^<]+<\/span><\/a>/);
      expect(url).not.toContain("<svg");
    });
  }

  it("S-302: VeriWorkly prints its rail and the letter's margins on every sheet", async () => {
    const html = await buildCoverLetterHtml(withLink("url"), "veriworkly-special");
    const print = html.match(/@media print\{(.*)\}<\/style>/)?.[1] ?? "";

    expect(print).toContain("aside{position:fixed;top:0;bottom:0;left:0}");
    expect(print).toMatch(/main\{[^}]*box-decoration-break:clone/);
  });
});

describe("Minimalist is ATS-friendly, so its labels extract as words", () => {
  it("prints 'COVER LETTER' and 'RE' unspaced in the PDF text layer", async () => {
    registerPdfTestFonts();

    const content = structuredClone(createDefaultCoverLetter("ats").content) as CoverLetterContent;
    content.subject = "Product Engineer";

    const element = await createCoverLetterPdfElement({ content, templateId: "minimalist" });
    const { text } = await extractResume(await renderToBuffer(element), "pdf");

    expect(text).toContain("COVER LETTER");
    expect(text).not.toMatch(/C O V E R/);
    expect(text).toMatch(/(^|\n)RE(\n|$)/);
  }, 60_000);
});

describe("the editor warns when the VeriWorkly rail cannot hold the contact list", () => {
  const manyLinks = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `l${index}`,
      type: "portfolio" as const,
      label: `Portfolio ${index}`,
      url: `https://example.com/people/someone-with-a-long-handle/project-${index}`,
    }));

  it("stays quiet for the sample letter", () => {
    expect(veriworklyRailOverflows(createDefaultCoverLetter("rail").content)).toBe(false);
  });

  it("warns for a contact list taller than the page", () => {
    const content = structuredClone(createDefaultCoverLetter("rail").content);
    content.links = { displayMode: "url", items: manyLinks(14) };

    expect(veriworklyRailOverflows(content)).toBe(true);
  });

  it("counts an icon-only link as one icon row, not its address", () => {
    const content = structuredClone(createDefaultCoverLetter("rail").content);
    content.links = { displayMode: "icon", items: manyLinks(14) };

    expect(veriworklyRailOverflows(content)).toBe(false);
  });
});

describe("S-296: the letter's date and language", () => {
  it("S-296: a month typed as YYYY-MM prints readably in every output; free text is kept", async () => {
    registerPdfTestFonts();

    for (const [label, output] of await allOutputs(letter({ date: "2026-01" }))) {
      expect(output, label).toContain("Jan 2026");
      expect(output.replace(/<[^>]*>/g, " "), label).not.toContain("2026-01");
    }

    const element = await createCoverLetterPdfElement({
      content: letter({ date: "2026-01" }),
      templateId: "professional",
    });
    expect((await extractResume(await renderToBuffer(element), "pdf")).text).toContain("Jan 2026");

    for (const [label, output] of await allOutputs(letter({ date: "January 1, 2026" }))) {
      expect(output, label).toContain("January 1, 2026");
    }
  }, 60_000);

  it("S-296: the HTML export carries the letter's language, English by default", async () => {
    for (const templateId of TEMPLATE_IDS) {
      expect(await buildCoverLetterHtml(letter({ language: "fr" }), templateId)).toContain(
        '<html lang="fr"',
      );
      expect(await buildCoverLetterHtml(letter(), templateId)).toContain(
        '<html lang="en" dir="ltr"',
      );
      expect(await buildCoverLetterHtml(letter({ language: "he" }), templateId)).toContain(
        '<html lang="he" dir="rtl"',
      );
    }
  });

  it("S-296: the language survives a round trip and stays absent on an older letter", () => {
    expect(parseCoverLetterContent({ ...letter(), language: "es-MX" }).language).toBe("es-MX");
    expect("language" in parseCoverLetterContent(letter())).toBe(false);
  });
});

describe("Decision 9: a letter's paper size reaches every output", () => {
  const TWIPS = { a4: { width: 11906, height: 16838 }, letter: { width: 12240, height: 15840 } };

  for (const paperSize of PAPER_SIZES) {
    it(`the DOCX section page is ${paperSize}`, async () => {
      const blob = await buildCoverLetterDocx(letter({}, { paperSize }));

      expect(await docxPageSize(blob)).toEqual(TWIPS[paperSize]);
    });

    it(`every template's HTML sizes its page and @page as ${paperSize}`, async () => {
      const { widthPx, heightPx } = getPageGeometry(paperSize);

      for (const templateId of TEMPLATE_IDS) {
        const html = await buildCoverLetterHtml(letter({}, { paperSize }), templateId);

        expect(html, templateId).toContain(`.page{width:${widthPx}px;min-height:${heightPx}px;`);
        expect(html, templateId).toContain(`@page{size:${widthPx}px ${heightPx}px;`);
      }
    });

    it(`the PDF page is ${paperSize}`, async () => {
      const { widthPt, heightPt } = getPageGeometry(paperSize);

      for (const templateId of TEMPLATE_IDS) {
        const element = await createCoverLetterPdfElement({
          content: letter({}, { paperSize }),
          templateId,
        });
        const page = (element.type as (props: unknown) => React.ReactElement)(element.props);
        const pageElement = (page.props as { children: React.ReactElement<{ size: unknown }> })
          .children;

        expect(pageElement.props.size, templateId).toEqual([widthPt, heightPt]);
      }
    });
  }

  it("a letter saved before the setting existed prints on A4", async () => {
    const content = letter();
    delete content.appearance.paperSize;

    expect(parseCoverLetterContent(content).appearance.paperSize).toBe("a4");
    expect(getCoverLetterState(content).page).toEqual(getPageGeometry("a4"));
    expect(await docxPageSize(await buildCoverLetterDocx(content))).toEqual(TWIPS.a4);
  });

  it("import keeps a Letter setting and reads an unknown one as A4", () => {
    const stored = letter({}, { paperSize: "letter" });

    expect(parseCoverLetterContent(stored).appearance.paperSize).toBe("letter");
    expect(
      parseCoverLetterContent({
        ...stored,
        appearance: { ...stored.appearance, paperSize: "legal" },
      }).appearance.paperSize,
    ).toBe("a4");
    expect(
      parseCoverLetterMarkdown(buildCoverLetterMarkdown(stored), stored).appearance.paperSize,
    ).toBe("letter");
  });
});
