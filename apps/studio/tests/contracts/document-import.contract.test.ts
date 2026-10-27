import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { importDocumentFromJsonFile } from "@/features/documents/services/import-service";
import { loadDocumentById } from "@/features/documents/services/document-workspace-service";
import { buildMarkdown } from "@/features/documents/export/export-markdown";
import { parseResumeMarkdown } from "@/features/resume/services/resume-markdown-import";
import { createLocalStorageMock } from "@/tests/utils/local-storage";
import { DOCUMENT_DATE_FORMATS } from "@/features/documents/utils/formatters";

/**
 * "Import JSON" is one shared menu item and must mean one thing.
 *
 * It used to mean two opposite things: the resume created a detached new document, while
 * the cover letter merged the file into whatever was open — keeping that document's `id`
 * and `cloudDocumentId`, so an imported file could be pushed over an unrelated cloud
 * document on the next sync. Both types now go through `DocumentDefinition.importJson`
 * plus `sanitizeImportedDocument`, which is the only place identity is minted.
 */

/** Minimal stand-in for the browser `File` the toolbar hands to the importer. */
function jsonFile(value: unknown): File {
  const text = JSON.stringify(value);

  return { text: () => Promise.resolve(text) } as unknown as File;
}

const FOREIGN_SYNC = {
  enabled: true,
  status: "synced",
  cloudDocumentId: "cloud-belonging-to-someone-elses-document",
  lastSyncedAt: "2026-01-01T00:00:00.000Z",
  revision: 42,
};

describe("document import contract", () => {
  beforeEach(() => {
    const localStorageMock = createLocalStorageMock();

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("imports a resume as a new saved document", async () => {
    const exported = {
      ...structuredClone(defaultResume),
      id: "resume-original",
      basics: { ...defaultResume.basics, fullName: "Ada Lovelace" },
    };

    const { document, saved } = await importDocumentFromJsonFile("RESUME", jsonFile(exported));

    expect(saved.ok).toBe(true);
    expect(document.id).not.toBe("resume-original");
    expect((document.content as ResumeData).basics.fullName).toBe("Ada Lovelace");
    expect(loadDocumentById("RESUME", document.id)?.id).toBe(document.id);
  });

  it("imports a cover letter as a new saved document, with the same outcome shape", async () => {
    const exported = createDefaultCoverLetter("cover-letter-original").content;

    const { document, saved } = await importDocumentFromJsonFile(
      "COVER_LETTER",
      jsonFile(exported),
    );

    expect(saved.ok).toBe(true);
    expect(document.type).toBe("COVER_LETTER");
    expect((document.content as CoverLetterContent).companyName).toBe("Acme Corp");
    expect(loadDocumentById("COVER_LETTER", document.id)?.id).toBe(document.id);
  });

  it("never lets an imported file carry over a foreign id or cloud linkage", async () => {
    const resumeFile = jsonFile({
      ...structuredClone(defaultResume),
      id: "resume-original",
      sync: FOREIGN_SYNC,
    });

    const coverLetterFile = jsonFile({
      ...createDefaultCoverLetter("cover-letter-original"),
      sync: FOREIGN_SYNC,
    });

    const resume = await importDocumentFromJsonFile("RESUME", resumeFile);
    const coverLetter = await importDocumentFromJsonFile("COVER_LETTER", coverLetterFile);

    for (const { document } of [resume, coverLetter]) {
      expect(document.id).not.toBe("resume-original");
      expect(document.id).not.toBe("cover-letter-original");
      expect(document.sync.cloudDocumentId).toBeNull();
      expect(document.sync.lastSyncedAt).toBeNull();
      expect(document.sync.enabled).toBe(false);
      expect(document.sync.status).toBe("local-only");
      expect(document.sync.revision).toBe(1);
    }

    // The resume's *content* carries its own id/sync copy, and the store round-trips
    // through it — so it has to be detached too, not just the envelope.
    const content = resume.document.content as ResumeData;

    expect(content.id).toBe(resume.document.id);
    expect(content.sync.cloudDocumentId).toBeNull();
    expect(content.sync.revision).toBe(1);
  });

  it("still rejects malformed input for both types", async () => {
    await expect(
      importDocumentFromJsonFile("RESUME", jsonFile("not a document")),
    ).rejects.toThrow();
    await expect(
      importDocumentFromJsonFile("COVER_LETTER", jsonFile("not a document")),
    ).rejects.toThrow();

    // Schema coercion, not just shape rejection: a NaN page margin must never reach state.
    const draft = getDocumentDefinition("COVER_LETTER").importJson({
      senderName: "Ada Lovelace",
      appearance: { pageMargin: "enormous", lineHeight: null },
      links: { items: [{ url: "https://example.com", type: "not-a-real-network" }] },
    });

    const content = draft?.content as CoverLetterContent;

    expect(Number.isFinite(content.appearance.pageMargin)).toBe(true);
    expect(Number.isFinite(content.appearance.lineHeight)).toBe(true);
    expect(content.links.items[0].type).toBe("custom");
  });

  it("accepts both the bare-content and full-envelope shapes for a cover letter", async () => {
    const envelope = createDefaultCoverLetter("cover-letter-original");

    const fromEnvelope = getDocumentDefinition("COVER_LETTER").importJson(envelope);
    const fromContent = getDocumentDefinition("COVER_LETTER").importJson(envelope.content);

    expect(fromEnvelope?.templateId).toBe(envelope.templateId);
    expect(fromEnvelope?.title).toBe(envelope.title);
    expect(fromContent?.content).toEqual(fromEnvelope?.content);
    // No envelope to read a title from, so it is derived from the target role and company.
    expect(fromContent?.title).toBe("Product Engineer - Acme Corp");
  });

  it("S-319: a cover letter's JSON export re-imports with its template and title", async () => {
    const downloads: Blob[] = [];
    vi.doMock("@/features/documents/export/download", () => ({
      downloadBlob: (blob: Blob) => downloads.push(blob),
    }));
    const { exportCoverLetterDocument } =
      await import("@/features/documents/export/cover-letter-exporters");

    const letter = {
      ...createDefaultCoverLetter("cover-letter-original"),
      title: "Globex, second round",
      templateId: "executive",
    };

    await exportCoverLetterDocument(letter, "json");
    const exported = JSON.parse(await downloads[0].text());

    expect(exported).not.toHaveProperty("sync");
    expect(getDocumentDefinition("COVER_LETTER").importJson(exported)).toMatchObject({
      title: "Globex, second round",
      templateId: "executive",
    });

    vi.doUnmock("@/features/documents/export/download");
  });

  it("S-118: refuses a file that does not say what it is", async () => {
    for (const type of ["RESUME", "COVER_LETTER"] as const) {
      await expect(importDocumentFromJsonFile(type, jsonFile({}))).rejects.toThrow(
        "Invalid document JSON",
      );
    }
  });

  it("S-118: refuses another document type's export", async () => {
    const resumeExport = structuredClone(defaultResume);
    const coverLetterEnvelope = createDefaultCoverLetter("cover-letter-original");

    await expect(
      importDocumentFromJsonFile("RESUME", jsonFile(coverLetterEnvelope.content)),
    ).rejects.toThrow("Invalid document JSON");
    await expect(
      importDocumentFromJsonFile("RESUME", jsonFile(coverLetterEnvelope)),
    ).rejects.toThrow("Invalid document JSON");
    await expect(
      importDocumentFromJsonFile("COVER_LETTER", jsonFile(resumeExport)),
    ).rejects.toThrow("Invalid document JSON");
    await expect(
      importDocumentFromJsonFile(
        "COVER_LETTER",
        jsonFile({ id: "r", type: "RESUME", templateId: "x", content: resumeExport }),
      ),
    ).rejects.toThrow("Invalid document JSON");
  });

  it("S-164: an import follows the workspace auto-sync setting, like any new document", async () => {
    window.localStorage.setItem(
      "veriworkly:workspace-settings",
      JSON.stringify({ autoSyncEnabled: true }),
    );

    const { document, saved } = await importDocumentFromJsonFile(
      "RESUME",
      jsonFile({ ...structuredClone(defaultResume), sync: FOREIGN_SYNC }),
    );

    expect(saved.ok).toBe(true);
    expect(document.sync.enabled).toBe(true);
    expect(document.sync.status).toBe("pending");
    expect(document.sync.cloudDocumentId).toBeNull();
    expect((document.content as ResumeData).sync.enabled).toBe(true);
  });
});

describe("resume Markdown import", () => {
  it("S-010: reads back the app's own Markdown export — roles, companies and dates", () => {
    const original = structuredClone(defaultResume);
    original.experience[0].startDate = "2021-03";
    original.experience[0].endDate = "2023-11";
    original.experience[0].current = false;
    original.experience[0].company = "Acme_Labs (EU)";

    const imported = parseResumeMarkdown(buildMarkdown(original));
    const visibleRoles = original.experience.filter((item) => item.role || item.company);

    expect(imported.basics.fullName).toBe(original.basics.fullName);
    expect(imported.basics.email).toBe(original.basics.email);
    expect(
      imported.experience.map(({ role, company, location, startDate, endDate, current }) => ({
        role,
        company,
        location,
        startDate,
        endDate,
        current,
      })),
    ).toEqual(
      visibleRoles.map(({ role, company, location, startDate, endDate, current }) => ({
        role,
        company,
        location,
        startDate,
        endDate: current ? "" : endDate,
        current,
      })),
    );
    expect(imported.experience[0].highlights).toEqual(original.experience[0].highlights);
    expect(imported.skills.map((group) => group.name)).toEqual(
      original.skills.map((group) => group.name),
    );

    // Nothing comes back escaped.
    expect(JSON.stringify(imported)).not.toMatch(/\\\\[-.()_|]/);
  });

  it("S-010: starts from an empty resume and adds no sample content", () => {
    const imported = parseResumeMarkdown("# Ada Lovelace\n\n## Experience\n\n### Analyst\n");

    expect(imported.basics.fullName).toBe("Ada Lovelace");
    expect(imported.experience).toHaveLength(1);
    expect(imported.experience[0]).toMatchObject({ role: "Analyst", company: "" });
    expect(imported.summary).toBe("");
    expect(imported.education).toEqual([]);
    expect(imported.projects).toEqual([]);
    expect(imported.skills).toEqual([]);
    expect(imported.links.items).toEqual([]);
    expect(JSON.stringify(imported)).not.toContain(defaultResume.basics.fullName);
  });
});

describe("resume Markdown import, every printed section", () => {
  /** One entry in each optional section and a custom one, the fields each prints filled in. */
  function everySectionResume(): ResumeData {
    const resume = structuredClone(defaultResume);

    resume.certificates = [
      {
        id: "c1",
        title: "AWS Certified Developer",
        issuer: "Amazon",
        date: "2024-05",
        website: "https://verify.example.com/aws",
        showLink: true,
        referenceId: "CRED-1",
        description: "Associate level.",
      },
    ];
    resume.awards = [
      {
        id: "a1",
        title: "Hackathon winner",
        awarder: "Acme",
        date: "2023-02",
        website: "",
        showLink: false,
        description: "First of forty teams.",
      },
    ];
    resume.publications = [
      {
        id: "p1",
        title: "Fast tables",
        publisher: "ACM",
        date: "2022-09",
        website: "https://doi.example.org/1",
        showLink: true,
        description: "",
      },
    ];
    resume.languages = [{ id: "l1", language: "Portuguese", fluency: "professional" }];
    resume.interests = [{ id: "i1", name: "Climbing", keywords: ["bouldering", "alpine"] }];
    resume.volunteer = [
      {
        id: "v1",
        organization: "Code Club",
        role: "Mentor",
        location: "Lisbon",
        startDate: "2021-01",
        endDate: "",
        current: true,
        summary: "Weekly sessions.",
      },
    ];
    resume.references = [
      {
        id: "r1",
        name: "Grace Hopper",
        title: "Rear Admiral",
        organization: "US Navy",
        email: "grace@example.com",
        phone: "+1 202 555 0100",
        relationship: "Former manager",
      },
    ];
    resume.achievements = [{ id: "ac1", title: "Cut costs 30%", description: "Across all teams." }];
    resume.customSections = [
      {
        id: "custom-default",
        kind: "custom",
        title: "Speaking",
        editableTitle: true,
        items: [
          {
            id: "s1",
            name: "RenderConf keynote",
            issuer: "RenderConf",
            date: "2024",
            link: "https://renderconf.example.com/talks/50%off",
            referenceId: "",
            description: "On page layout.",
            details: ["Two thousand attendees."],
          },
        ],
      },
    ];

    return resume;
  }

  it("round-trips every section the Markdown export prints", () => {
    const markdown = buildMarkdown(everySectionResume());
    const imported = parseResumeMarkdown(markdown);

    // What the import reads back prints exactly what was exported.
    expect(buildMarkdown(imported)).toBe(markdown);
  });

  for (const dateFormat of DOCUMENT_DATE_FORMATS) {
    it(`S-296: every printed date reads back as the stored month, printed as ${dateFormat}`, () => {
      const resume = everySectionResume();
      resume.customization = { ...resume.customization, dateFormat };
      resume.customSections[0].items.push({
        ...resume.customSections[0].items[0],
        id: "s2",
        name: "Meetup talk",
        date: "2023-11",
      });
      resume.customSections[0].items.push({
        ...resume.customSections[0].items[0],
        id: "s3",
        name: "Panel",
        date: "Spring 2019",
      });

      const markdown = buildMarkdown(resume);
      if (dateFormat !== "YYYY-MM") expect(markdown).not.toContain("2022-03");
      expect(markdown).toContain("–");

      const imported = parseResumeMarkdown(markdown);

      expect(imported.experience[0]).toMatchObject({
        startDate: "2022-03",
        endDate: "",
        current: true,
      });
      expect(imported.education[0]).toMatchObject({ startDate: "2015", endDate: "2019" });
      expect(imported.certificates[0].date).toBe("2024-05");
      expect(imported.awards[0].date).toBe("2023-02");
      expect(imported.publications[0].date).toBe("2022-09");
      expect(imported.volunteer[0]).toMatchObject({
        startDate: "2021-01",
        endDate: "",
        current: true,
      });
      expect(imported.customSections[0].items.map((item) => item.date)).toEqual([
        "2024",
        "2023-11",
        "Spring 2019",
      ]);
    });
  }

  it("S-296: a Present-only range reads back as current", () => {
    const resume = everySectionResume();
    resume.volunteer = [{ ...resume.volunteer[0], startDate: "" }];

    const imported = parseResumeMarkdown(buildMarkdown(resume));

    expect(imported.volunteer[0]).toMatchObject({ startDate: "", endDate: "", current: true });
  });

  it("S-296: renamed headings read back into their own sections", () => {
    const resume = everySectionResume();
    resume.sections = resume.sections.map((section) =>
      section.id === "experience"
        ? { ...section, label: "Berufserfahrung" }
        : section.id === "certifications"
          ? { ...section, label: "Zertifikate" }
          : section,
    );

    const markdown = buildMarkdown(resume);
    expect(markdown).toContain("## Berufserfahrung");

    const imported = parseResumeMarkdown(markdown, resume);

    expect(imported.experience[0].company).toBe(resume.experience[0].company);
    expect(imported.certificates[0].title).toBe("AWS Certified Developer");
    expect(imported.customSections.map((section) => section.title)).toEqual(["Speaking"]);
    // A file written with the default headings still reads into a renamed resume.
    const plain = parseResumeMarkdown(buildMarkdown(everySectionResume()), resume);
    expect(plain.experience[0].company).toBe(resume.experience[0].company);
    // Case does not matter.
    const shouted = parseResumeMarkdown(
      markdown.replace("## Berufserfahrung", "## BERUFSERFAHRUNG"),
      resume,
    );
    expect(shouted.experience).toHaveLength(resume.experience.length);
  });

  it("S-296: a Markdown import keeps the open resume's language", () => {
    const resume = { ...everySectionResume(), language: "de" };

    expect(parseResumeMarkdown(buildMarkdown(resume), resume).language).toBe("de");
  });

  it("keeps phone numbers in their stored E.164 form through a round trip", () => {
    const resume = everySectionResume();
    resume.basics.phone = "+442079460958";
    resume.references = [{ ...resume.references[0], phone: "+14155550142" }];

    const imported = parseResumeMarkdown(buildMarkdown(resume));

    expect(imported.basics.phone).toBe("+442079460958");
    expect(imported.references[0].phone).toBe("+14155550142");
  });

  it("does not fail on a link with a bare percent sign", () => {
    const markdown = "# Ada\n\n## Projects\n\n### Tool\n[Sale](https://x.com/50%off)\n";

    expect(() => parseResumeMarkdown(markdown)).not.toThrow();
    expect(parseResumeMarkdown(markdown).projects[0].link).toBe("https://x.com/50%off");
  });
});
