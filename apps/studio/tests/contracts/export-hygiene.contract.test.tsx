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
import { getResumeSectionHeading } from "@/features/documents/rendering/resume-render-items";
import {
  parseResumeDataInput,
  parseResumeImport,
} from "@/features/resume/schemas/resume-storage-schema";
import { buildResumeDocx } from "@/features/documents/export/docx/resume-docx";
import { PAPER_SIZES, getPageGeometry, type PaperSize } from "@/templates/shared/page-geometry";
import { docxPageSize } from "@/tests/utils/docx";
import {
  formatDateRange,
  formatDocumentDate,
  toDocumentDateFormat,
  toDocumentLanguage,
  isDocumentLanguage,
  documentDirection,
} from "@/features/documents/utils/formatters";

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
    expect(text).toContain("Jan 2020 – Present");
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

describe("S-296: readable dates", () => {
  it("S-296: prints a stored month in each of the three formats", () => {
    expect(formatDocumentDate("2022-03")).toBe("Mar 2022");
    expect(formatDocumentDate("2022-03", "MMM YYYY")).toBe("Mar 2022");
    expect(formatDocumentDate("2022-03", "MM/YYYY")).toBe("03/2022");
    expect(formatDocumentDate("2022-03", "YYYY-MM")).toBe("2022-03");
    expect(formatDocumentDate(" 2019-12 ", "MMM YYYY")).toBe("Dec 2019");
  });

  it("S-296: joins a range with an en dash and prints Present for a current end", () => {
    expect(formatDateRange("2022-03", "", true)).toBe("Mar 2022 – Present");
    expect(formatDateRange("2022-03", "2024-11", false, "MM/YYYY")).toBe("03/2022 – 11/2024");
    expect(formatDateRange("2022-03", "2024-11", false, "YYYY-MM")).toBe("2022-03 – 2024-11");
    expect(formatDateRange("", "", true)).toBe("Present");
    expect(formatDateRange("2022-03", "", false)).toBe("Mar 2022");
    expect(formatDateRange("", "", false)).toBe("");
  });

  it("S-296: prints a year-only, free-text or invalid date exactly as typed", () => {
    expect(formatDateRange("2018", "2022", false)).toBe("2018 – 2022");
    expect(formatDocumentDate("Spring 2019")).toBe("Spring 2019");
    expect(formatDocumentDate("Jan 2020", "MM/YYYY")).toBe("Jan 2020");
    expect(formatDocumentDate("2022-13")).toBe("2022-13");
    expect(formatDocumentDate("2022-00")).toBe("2022-00");
    expect(formatDocumentDate("2022-03-15")).toBe("2022-03-15");
    expect(formatDocumentDate("")).toBe("");
  });

  it("S-296: reads an unknown stored format as the default", () => {
    expect(toDocumentDateFormat("MM/YYYY")).toBe("MM/YYYY");
    expect(toDocumentDateFormat("DD.MM.YYYY")).toBe("MMM YYYY");
    expect(toDocumentDateFormat(undefined)).toBe("MMM YYYY");
  });

  it("S-296: a resume stored before the format existed parses unchanged and reads the default", () => {
    const stored = JSON.parse(JSON.stringify(defaultResume)) as Record<string, unknown>;
    const customization = { ...(stored.customization as Record<string, unknown>) };
    delete customization.dateFormat;
    stored.customization = customization;
    delete stored.language;

    const parsed = parseResumeDataInput(stored);

    expect(parsed?.customization.dateFormat).toBe("MMM YYYY");
    expect(parsed?.experience).toEqual(defaultResume.experience);
    expect(toDocumentLanguage(parsed?.language)).toBe("en");

    // An unknown value never makes the document unreadable.
    const odd = parseResumeDataInput({
      ...stored,
      customization: { ...customization, dateFormat: "DD.MM.YYYY" },
      language: 42,
    });

    expect(odd?.customization.dateFormat).toBe("MMM YYYY");
  });
});

describe("S-296: editable section headings", () => {
  it("S-296: a renamed heading prints, an empty one falls back to the default", () => {
    expect(getResumeSectionHeading({ id: "experience", label: "Berufserfahrung" })).toBe(
      "Berufserfahrung",
    );
    expect(getResumeSectionHeading({ id: "experience", label: "   " })).toBe("Experience");
    expect(getResumeSectionHeading({ id: "certifications", label: "" })).toBe("Certifications");
    expect(getResumeSectionHeading({ id: "summary", label: "Profil" })).toBe("Profil");
  });

  it("S-296: the document language is a BCP-47 tag or English", () => {
    expect(toDocumentLanguage("de")).toBe("de");
    expect(toDocumentLanguage(" pt-BR ")).toBe("pt-BR");
    expect(toDocumentLanguage("de_DE")).toBe("de-DE");
    expect(isDocumentLanguage("de_DE")).toBe(true);
    expect(isDocumentLanguage("")).toBe(true);
    expect(isDocumentLanguage("German")).toBe(false);
    expect(toDocumentLanguage("German")).toBe("en");
    expect(toDocumentLanguage("zh-Hant-TW")).toBe("zh-Hant-TW");
    expect(toDocumentLanguage("")).toBe("en");
    expect(toDocumentLanguage('en" onload="x')).toBe("en");
    expect(toDocumentLanguage(undefined)).toBe("en");
  });
});

/** A resume with one current role from March 2022, its Experience heading renamed. */
function localisedResume(dateFormat?: ResumeData["customization"]["dateFormat"]): ResumeData {
  const resume = unfinishedResume();

  resume.basics.fullName = "Ada Lovelace";
  resume.experience[0].startDate = "2022-03";
  resume.education = [
    {
      id: "edu-1",
      school: "Riverside College",
      degree: "BSc",
      field: "Physics",
      startDate: "2018",
      endDate: "2022",
      current: false,
      summary: "",
    },
  ];
  resume.sections = resume.sections.map((section) =>
    section.id === "experience"
      ? { ...section, label: "Berufserfahrung" }
      : section.id === "education"
        ? { ...section, label: "" }
        : section,
  );
  resume.language = "de";
  if (dateFormat) resume.customization = { ...resume.customization, dateFormat };

  return resume;
}

describe("S-296: every output prints the formatted date and the renamed heading", () => {
  beforeAll(() => {
    registerPdfTestFonts();
  });

  it("S-296: the preview of every template", async () => {
    for (const template of templateRegistry) {
      const Template = await loadTemplateComponentById(template.id);
      const html = renderToStaticMarkup(
        <Template resume={{ ...localisedResume(), templateId: template.id }} />,
      );

      expect(html, template.id).toContain("Mar 2022 – Present");
      expect(html, template.id).toContain("2018 – 2022");
      expect(html, template.id).toContain("Berufserfahrung");
      expect(html, template.id).toContain("Education");
      expect(html, template.id).not.toMatch(/>Experience</);
    }
  }, 60_000);

  it("S-296: PDF, DOCX, HTML, Markdown and text", async () => {
    const files = await exportAllFormats(localisedResume());

    for (const format of ["pdf", "docx", "html", "markdown", "txt"] as const) {
      const text = files[format].replace(/<[^>]*>/g, " ");

      expect(text, format).toContain("Mar 2022 – Present");
      expect(text, format).toContain("2018 – 2022");
      expect(text.toLowerCase(), format).toContain("berufserfahrung");
      expect(text.toLowerCase(), format).toContain("education");
    }

    // The stored value stays the month the input wrote.
    expect(files.json).toContain('"startDate": "2022-03"');
  }, 60_000);

  it("S-296: the chosen numeric format reaches every file", async () => {
    const files = await exportAllFormats(localisedResume("MM/YYYY"));

    for (const format of ["pdf", "docx", "html", "markdown", "txt"] as const) {
      expect(files[format], format).toContain("03/2022 – Present");
    }
  }, 60_000);

  it("S-296: every dated entry prints in the chosen format", async () => {
    const resume = localisedResume("MM/YYYY");
    resume.certificates = [
      {
        id: "c1",
        title: "Cert",
        issuer: "Org",
        date: "2021-04",
        website: "",
        showLink: false,
        referenceId: "",
        description: "",
      },
    ];
    resume.awards = [
      {
        id: "a1",
        title: "Award",
        awarder: "Org",
        date: "2020-05",
        website: "",
        showLink: false,
        description: "",
      },
    ];
    resume.publications = [
      {
        id: "p1",
        title: "Paper",
        publisher: "ACM",
        date: "2019-06",
        website: "",
        showLink: false,
        description: "",
      },
    ];
    resume.volunteer = [
      {
        id: "v1",
        organization: "Club",
        role: "Mentor",
        location: "",
        startDate: "2018-07",
        endDate: "2019-08",
        current: false,
        summary: "",
      },
    ];
    resume.customSections[0].items[0].date = "2017-09";

    const files = await exportAllFormats(resume);
    const Template = await loadTemplateComponentById(templateRegistry[0].id);
    const preview = renderToStaticMarkup(<Template resume={resume} />);

    for (const [label, output] of [...Object.entries(files), ["preview", preview]]) {
      if (label === "json") continue;
      for (const printed of ["04/2021", "05/2020", "06/2019", "07/2018 – 08/2019", "09/2017"]) {
        expect(output, `${label}: ${printed}`).toContain(printed);
      }
    }
  }, 60_000);

  it("S-296: a right-to-left language exports right to left", async () => {
    expect(documentDirection("ar")).toBe("rtl");
    expect(documentDirection("he-IL")).toBe("rtl");
    expect(documentDirection("fa")).toBe("rtl");
    expect(documentDirection("ur-PK")).toBe("rtl");
    expect(documentDirection("de")).toBe("ltr");
    expect(documentDirection(undefined)).toBe("ltr");

    const resume = { ...localisedResume(), language: "ar" };
    expect(buildHtml(resume)).toContain('<html lang="ar" dir="rtl"');
    expect(buildHtml(localisedResume())).toContain('<html lang="de" dir="ltr"');

    const downloads = captureDownloads();
    stubRenderedPreview(794, 619);
    await exportResumeAsHtml(resume, "preview");
    expect(await downloads[0].blob.text()).toContain('<html lang="ar" dir="rtl"');
  });

  it("S-296: both HTML exports carry the document language", async () => {
    expect(buildHtml(localisedResume())).toContain('<html lang="de"');
    expect(buildHtml(structuredClone(defaultResume))).toContain('<html lang="en"');

    const downloads = captureDownloads();
    stubRenderedPreview(794, 619);

    await exportResumeAsHtml(localisedResume(), "preview");

    expect(await downloads[0].blob.text()).toContain('<html lang="de"');
  });
});

describe("Decision 9: a resume's paper size reaches every output", () => {
  const TWIPS = { a4: { width: 11906, height: 16838 }, letter: { width: 12240, height: 15840 } };

  function onPaper(paperSize: PaperSize): ResumeData {
    const resume = structuredClone(defaultResume);
    resume.customization.paperSize = paperSize;
    return resume;
  }

  for (const paperSize of PAPER_SIZES) {
    const { widthPx, heightPx } = getPageGeometry(paperSize);

    it(`the DOCX section page is ${paperSize}`, async () => {
      expect(await docxPageSize(await buildResumeDocx(onPaper(paperSize)))).toEqual(
        TWIPS[paperSize],
      );
    });

    it(`the WYSIWYG HTML prints one ${paperSize} page per sheet`, async () => {
      const downloads = captureDownloads();
      stubRenderedPreview(widthPx, widthPx);

      await exportResumeAsHtml(onPaper(paperSize), "preview");

      const html = await downloads[0].blob.text();

      expect(html.match(/@page \{\s*size: (\d+)px (\d+)px;/)?.slice(1)).toEqual([
        String(widthPx),
        String(heightPx),
      ]);
    });

    it(`the generated HTML states a ${paperSize} @page`, () => {
      expect(buildHtml(onPaper(paperSize))).toContain(
        `@page { size: ${widthPx}px ${heightPx}px; }`,
      );
    });
  }

  it("a resume saved before the setting existed is A4 everywhere", async () => {
    const resume = structuredClone(defaultResume);
    delete resume.customization.paperSize;

    expect(getResumeRenderStyle(resume).paperSize).toBe("a4");
    expect(parseResumeDataInput(resume)?.customization.paperSize).toBe("a4");
    expect(await docxPageSize(await buildResumeDocx(resume))).toEqual(TWIPS.a4);
    expect(buildHtml(resume)).toContain("@page { size: 794px 1122px; }");
  });

  it("storage and import keep Letter and read an unknown size as A4", () => {
    const letter = onPaper("letter");

    expect(parseResumeDataInput(letter)?.customization.paperSize).toBe("letter");
    expect(parseResumeImport(letter)?.customization.paperSize).toBe("letter");
    expect(
      parseResumeDataInput({
        ...letter,
        customization: { ...letter.customization, paperSize: "legal" },
      })?.customization.paperSize,
    ).toBe("a4");
  });
});
