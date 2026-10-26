import { inflateRawSync } from "node:zlib";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

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
import { DOCUMENT_PAGE_HEIGHT_PX, DOCUMENT_PAGE_WIDTH_PX } from "@/templates/shared/page-geometry";

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

/** Every file inside a .docx (a zip), decoded as text. Reads the central directory. */
async function unzipDocx(blob: Blob): Promise<Map<string, string>> {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const files = new Map<string, string>();
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let entry = bytes.readUInt32LE(end + 16);

  for (let count = bytes.readUInt16LE(end + 10); count > 0; count -= 1) {
    const method = bytes.readUInt16LE(entry + 10);
    const size = bytes.readUInt32LE(entry + 20);
    const nameLength = bytes.readUInt16LE(entry + 28);
    const extraLength = bytes.readUInt16LE(entry + 30);
    const commentLength = bytes.readUInt16LE(entry + 32);
    const local = bytes.readUInt32LE(entry + 42);
    const name = bytes.toString("utf8", entry + 46, entry + 46 + nameLength);
    const dataStart = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    const data = bytes.subarray(dataStart, dataStart + size);

    files.set(name, (method === 8 ? inflateRawSync(data) : data).toString("utf8"));
    entry += 46 + nameLength + extraLength + commentLength;
  }

  return files;
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
      // The preview markup holds the letter twice: the measuring probe and the page.
      const copies = name.endsWith("preview") ? 2 : 1;
      expect(output.match(/P\.S\./g), `${name} prints one "P.S."`).toHaveLength(copies);
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

      expect(html, templateId).toContain(`width:${DOCUMENT_PAGE_WIDTH_PX}px`);
      expect(html, templateId).toContain(`min-height:${DOCUMENT_PAGE_HEIGHT_PX}px`);
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
