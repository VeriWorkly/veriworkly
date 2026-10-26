import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { extractResume } from "@veriworkly/ats-engine/node";

import type { ResumeData } from "@/types/resume";
import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";

import { blankResume, defaultResume } from "@/features/resume/constants/default-resume";
import { exportResumeDocument } from "@/features/documents/export/resume-exporters";
import { buildHtml, exportResumeAsHtml } from "@/features/documents/export/export-html";
import { buildText } from "@/features/documents/export/export-text";
import { buildResumeSections } from "@/templates/resume/shared/model";
import { captureDownloads } from "@/tests/utils/downloads";
import {
  cleanResumeText,
  getLinkDisplayText,
  getResumeRenderModel,
  getResumeRenderStyle,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import {
  getEducationRenderItems,
  getExperienceRenderItems,
  getProjectRenderItems,
} from "@/templates/resume/shared/model";
import { loadTemplateComponentById, templateRegistry } from "@/templates";
import { registerPdfTestFonts } from "@/tests/utils/pdf";

/**
 * An entry the user has partially filled: real company and bullets, but no role, and no
 * dates. Every field that a template might substitute a placeholder for is blank.
 */
function partiallyFilledResume(): ResumeData {
  const resume = structuredClone(defaultResume) as ResumeData;

  resume.experience = [
    {
      id: "exp-partial",
      company: "Northwind Trading",
      role: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      summary: "",
      highlights: ["Rebuilt the settlement pipeline."],
    },
  ];

  resume.education = [
    {
      id: "edu-partial",
      school: "Riverside College",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
      current: false,
      summary: "",
    },
  ];

  resume.projects = [
    {
      id: "proj-partial",
      name: "",
      role: "",
      link: "",
      linkLabel: "Link",
      showLinkAsText: true,
      summary: "An internal tool.",
      highlights: [],
      skills: [],
    },
  ];

  return resume;
}

/**
 * Editor-only placeholder words that must never reach rendered output.
 *
 * Excludes words that double as legitimate section headings ("Education", "Projects"),
 * which cannot be distinguished from a leaked placeholder by text alone — those are
 * covered by the render-model assertion instead.
 */
const PLACEHOLDER_WORDS = ["Role", "Company", "Degree", "School", "Start", "End"];

describe("export hygiene contract", () => {
  it("leaves titles empty for blank fields instead of substituting the field label", () => {
    const resume = partiallyFilledResume();
    const model = getResumeRenderModel(resume);

    // Each entry has content (so it survives filtering) but no title field.
    expect(model.visibleExperience).toHaveLength(1);
    expect(model.visibleEducation).toHaveLength(1);
    expect(model.visibleProjects).toHaveLength(1);

    expect(getExperienceRenderItems(model.visibleExperience)[0].title).toBe("");
    expect(getEducationRenderItems(model.visibleEducation)[0].title).toBe("");
    expect(getProjectRenderItems(model.visibleProjects)[0].title).toBe("");

    // A blank date range must not print "Start - End".
    expect(getExperienceRenderItems(model.visibleExperience)[0].meta).toBe("");
  });

  it("does not render placeholder words for a partially filled resume in any template", async () => {
    const resume = partiallyFilledResume();

    for (const template of templateRegistry) {
      const TemplateComponent = await loadTemplateComponentById(template.id);
      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...resume, templateId: template.id }} />,
      );

      // Strip attributes so class names and ids cannot produce false positives.
      const text = html.replace(/<[^>]*>/g, " ");

      for (const word of PLACEHOLDER_WORDS) {
        expect(
          new RegExp(`(^|\\s)${word}(\\s|$)`).test(text),
          `${template.id} must not print the placeholder "${word}"`,
        ).toBe(false);
      }

      // The real content the user did enter must still be there.
      expect(html).toContain("Northwind Trading");
      expect(html).toContain("Riverside College");
    }
  });

  it("neutralizes non-http link schemes rather than emitting them as hrefs", () => {
    const dangerous = [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ];

    for (const url of dangerous) {
      const href = normalizeLinkHref(url);

      // Anything outside the allowlist is prefixed, which renders it inert as a URL.
      expect(href.toLowerCase().startsWith("javascript:")).toBe(false);
      expect(href.toLowerCase().startsWith("data:")).toBe(false);
      expect(href.toLowerCase().startsWith("vbscript:")).toBe(false);
      expect(href.toLowerCase().startsWith("file:")).toBe(false);
      expect(href.startsWith("https://")).toBe(true);
    }
  });

  it("keeps the schemes a resume legitimately needs", () => {
    expect(normalizeLinkHref("https://example.com")).toBe("https://example.com");
    expect(normalizeLinkHref("http://example.com")).toBe("http://example.com");
    expect(normalizeLinkHref("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(normalizeLinkHref("tel:+15550100")).toBe("tel:+15550100");
    expect(normalizeLinkHref("example.com")).toBe("https://example.com");
    expect(normalizeLinkHref("")).toBe("");
  });

  it("neutralizes schemes split by whitespace or control characters", () => {
    // Browsers historically tolerated whitespace inside a scheme; cleanResumeText
    // collapses it, which must not accidentally reassemble a live scheme.
    for (const url of [
      "java\nscript:alert(1)",
      "java\tscript:alert(1)",
      "  javascript:alert(1)  ",
    ]) {
      expect(normalizeLinkHref(url).toLowerCase()).not.toMatch(/^javascript:/);
    }
  });
});

describe("cleanResumeText", () => {
  it("S-127: keeps line breaks and collapses only spaces and tabs", () => {
    expect(cleanResumeText("First  paragraph\t here. \r\n\nSecond line")).toBe(
      "First paragraph here.\n\nSecond line",
    );
    expect(cleanResumeText("  Jane   Doe  ")).toBe("Jane Doe");
  });
});

/**
 * A resume as a user leaves it mid-edit: no name, a project with no title or link label, a
 * custom entry with only a description. Every format must print what is there and nothing
 * the user did not type.
 */
function unfinishedResume(): ResumeData {
  const resume = structuredClone(blankResume);

  resume.basics = {
    ...resume.basics,
    fullName: "",
    role: "Platform Engineer",
    email: "a_b.c@x.com",
    phone: "+1 415 555 0142",
    location: "Lisbon",
  };
  resume.experience = [
    {
      id: "exp-1",
      role: "Staff Engineer",
      company: "Northwind_Trading",
      location: "Remote",
      startDate: "Jan 2020",
      endDate: "",
      current: true,
      summary: "",
      highlights: ["Cut p99 latency by 40% - and kept it there."],
    },
  ];
  resume.projects = [
    {
      id: "proj-1",
      name: "",
      role: "",
      link: "https://github.com/acme/tool_kit?tab=readme",
      linkLabel: "",
      showLinkAsText: true,
      summary: "An internal tool.",
      highlights: [],
      skills: ["TypeScript", "Rust"],
    },
  ];
  resume.customSections = [
    {
      id: "custom-1",
      kind: "custom",
      title: "Extras",
      editableTitle: true,
      items: [
        {
          id: "custom-item-1",
          name: "",
          issuer: "",
          date: "",
          link: "",
          referenceId: "",
          description: "Organised the city meetup.",
          details: [],
        },
      ],
    },
  ];
  resume.sections = resume.sections.map((section) =>
    section.id === "custom" ? { ...section, customSectionId: "custom-1" } : section,
  );

  return resume;
}

function resumeDocument(resume: ResumeData): BaseDocument {
  return {
    id: resume.id,
    type: "RESUME",
    title: "",
    templateId: resume.templateId,
    content: resume,
    updatedAt: resume.updatedAt,
    sync: resume.sync,
  };
}

/** The text of every file the six exporters write, as a reader or a parser would see it. */
async function exportAllFormats(resume: ResumeData): Promise<Record<ExportFormat, string>> {
  const downloads = captureDownloads();
  const out = {} as Record<ExportFormat, string>;

  for (const format of RESUME_FORMATS) {
    await exportResumeDocument(resumeDocument(resume), format);
    const { blob } = downloads[downloads.length - 1];

    out[format] =
      format === "pdf" || format === "docx"
        ? (await extractResume(new Uint8Array(await blob.arrayBuffer()), format)).text
        : await blob.text();
  }

  return out;
}

const RESUME_FORMATS: ExportFormat[] = ["pdf", "docx", "html", "markdown", "json", "txt"];

const EXPORT_PLACEHOLDERS = [
  ...PLACEHOLDER_WORDS,
  "Your Name",
  "Item",
  "Link",
  "Application",
  "Open role",
];

describe("every resume export format", () => {
  beforeAll(() => {
    registerPdfTestFonts();
  });

  it("S-108: prints no placeholder in any of the six formats", async () => {
    const files = await exportAllFormats(unfinishedResume());

    for (const format of RESUME_FORMATS) {
      // Tags and attributes out, so markup cannot produce a false positive.
      const text = files[format].replace(/<[^>]*>/g, " ");

      for (const word of EXPORT_PLACEHOLDERS) {
        expect(
          new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u").test(text),
          `${format} must not print the placeholder "${word}": ${text.match(new RegExp(`.{0,40}${word}.{0,40}`))?.[0]}`,
        ).toBe(false);
      }

      expect(text, format).toContain("Organised the city meetup");
    }
  }, 60_000);

  it("S-102: DOCX, Markdown, text and HTML carry the preview's sections, in its order", async () => {
    const resume = unfinishedResume();
    resume.basics.fullName = "Ada Lovelace";
    resume.summary = "Builds reliable systems.";
    // Projects ahead of experience, and the header hidden.
    resume.sections = resume.sections.map((section) =>
      section.id === "projects"
        ? { ...section, order: 2 }
        : section.id === "summary"
          ? { ...section, order: 5 }
          : section.id === "basics"
            ? { ...section, visible: false }
            : section,
    );

    const expected = buildResumeSections(resume, getResumeRenderModel(resume), {
      items: () => null,
      skills: () => null,
      summary: () => null,
    }).map((section) => section.title);

    expect(expected).toEqual(["Projects", "Experience", "Summary", "Extras"]);

    const files = await exportAllFormats(resume);
    const positions = (text: string, titles: string[]) =>
      titles.map((title) => text.search(new RegExp(`^(## )?${title}$`, "im")));

    for (const format of ["docx", "markdown", "txt"] as const) {
      const found = positions(files[format], expected);

      expect(
        found.every((index) => index >= 0),
        `${format}\n${files[format]}`,
      ).toBe(true);
      expect(
        [...found].sort((a, b) => a - b),
        format,
      ).toEqual(found);
    }

    const htmlTitles = [...files.html.matchAll(/<h2>(.*?)<\/h2>/g)].map((match) => match[1]);
    expect(htmlTitles).toEqual(expected);

    for (const format of ["docx", "html", "markdown", "txt"] as const) {
      // Hidden basics: neither the name nor any contact detail.
      expect(files[format], format).not.toContain("Ada Lovelace");
      expect(files[format], format).not.toMatch(/a\\?_b\\?\.c@x\\?\.com/);
      // The project's stack, and its link shown as the address the preview shows.
      expect(files[format], format).toMatch(/TypeScript, Rust/);
      expect(files[format], format).toContain("github");
    }
  }, 60_000);

  it("S-289: prints a stored E.164 phone the way people write it, in every format", async () => {
    const resume = unfinishedResume();
    resume.basics.phone = "+442079460958";
    resume.references = [
      {
        id: "ref-1",
        name: "Grace Hopper",
        title: "",
        organization: "",
        relationship: "",
        email: "",
        phone: "+14155550142",
      },
    ];

    const files = await exportAllFormats(resume);

    for (const format of ["pdf", "docx", "html", "markdown", "txt"] as const) {
      expect(files[format], format).toContain("+44 20 7946 0958");
      expect(files[format], format).toContain("+1 415 555 0142");
      // The `tel:` link keeps the dialable form; only the printed text is spaced.
      expect(files[format].replace(/<[^>]*>/g, " "), format).not.toContain("+442079460958");
    }

    // Storage keeps the canonical form.
    expect(files.json).toContain("+442079460958");

    for (const template of templateRegistry) {
      const Template = await loadTemplateComponentById(template.id);
      const html = renderToStaticMarkup(
        <Template resume={{ ...resume, templateId: template.id }} />,
      );

      expect(html, template.id).toContain("+44 20 7946 0958");
      expect(html, template.id).toContain('href="tel:+442079460958"');
    }
  }, 60_000);

  it("S-009: plain text is built from the data, not from escaped Markdown", async () => {
    const resume = unfinishedResume();
    resume.basics.fullName = "Ada Lovelace";
    const text = buildText(resume);

    expect(text).not.toContain("\\");
    expect(text).toContain("a_b.c@x.com");
    expect(text).toContain("Northwind_Trading");
    expect(text).toContain("Jan 2020 - Present");
    expect(text).toContain("Cut p99 latency by 40% - and kept it there.");
    expect(text).toContain("tool_kit");
  });

  it("escapes markup in the generated HTML", () => {
    const resume = unfinishedResume();
    resume.basics.fullName = '<img src=x onerror="alert(1)">';

    const html = buildHtml(resume);

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});

describe("render model details", () => {
  it("S-110: keeps a spacing or page padding of zero", () => {
    const resume = structuredClone(blankResume);
    resume.customization = { ...resume.customization, sectionSpacing: 0, pagePadding: 0 };

    expect(getResumeRenderStyle(resume)).toMatchObject({ sectionSpacing: 0, pagePadding: 0 });
  });

  it("prints a link address with its query string", () => {
    const link = { id: "l", type: "custom" as const, label: "", url: "example.com/jobs?id=42" };

    expect(getLinkDisplayText(link, "url")).toBe("example.com/jobs?id=42");
  });
});

/**
 * Just enough DOM for the WYSIWYG branch of the HTML export: a preview root whose layout
 * width is `offsetWidth` and whose on-screen box, under the editor's zoom, is
 * `rectWidth`. Styles and fonts are stubbed empty; the test reads the page box width.
 */
function stubRenderedPreview(offsetWidth: number, rectWidth: number) {
  const clone = {
    style: { cssText: "", margin: "", width: "", maxWidth: "", boxSizing: "" },
    children: [],
    get outerHTML() {
      return `<div style="width: ${clone.style.width}"></div>`;
    },
  };
  const root = {
    offsetWidth,
    children: [],
    getBoundingClientRect: () => ({ width: rectWidth }),
    cloneNode: () => clone,
  };
  const container = { querySelector: () => root, firstElementChild: root };

  vi.stubGlobal("document", {
    ...globalThis.document,
    documentElement: { dir: "" },
    getElementById: (id: string) => (id === "preview" ? container : null),
  });
  vi.stubGlobal("window", {
    location: { origin: "http://localhost" },
    getComputedStyle: () => ({ length: 0, item: () => "", display: "block", opacity: "1" }),
  });
  vi.stubGlobal("fetch", async () => new Response(new Blob(["font"])));
  vi.stubGlobal(
    "FileReader",
    class {
      result = "data:font/ttf;base64,Zm9udA==";
      onload: (() => void) | null = null;
      readAsDataURL() {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
}

describe("S-285: WYSIWYG HTML export", () => {
  it("S-285: takes the page width from layout, not from the zoomed preview", async () => {
    const downloads = captureDownloads();
    stubRenderedPreview(794, 619);

    await exportResumeAsHtml(structuredClone(defaultResume), "preview");

    const html = await downloads[0].blob.text();
    expect(html).toContain("width: 794px");
    expect(html).toMatch(/@page \{\s*size: 794px 1122px;/);
  });

  it("S-285: falls back to the generated document when the preview is hidden", async () => {
    const downloads = captureDownloads();
    const resume = structuredClone(defaultResume);
    stubRenderedPreview(0, 0);

    await exportResumeAsHtml(resume, "preview");

    expect(await downloads[0].blob.text()).toBe(buildHtml(resume));
  });
});

describe("S-301: resume colours", () => {
  it("S-301: draws a half-typed or unsafe colour as the default, in every renderer", () => {
    const resume = structuredClone(defaultResume);
    resume.customization = {
      ...resume.customization,
      accentColor: "#12",
      textColor: "red;}body{display:none",
      sectionHeadingColor: "",
      pageBackgroundColor: " #FAFAFA ",
    };

    const style = getResumeRenderStyle(resume);

    expect(style.accentColor).toBe("#2563eb");
    expect(style.textColor).toBe("#0f172a");
    expect(style.sectionHeadingColor).toBe("#2563eb");
    expect(style.pageBackgroundColor).toBe("#FAFAFA");
  });
});
