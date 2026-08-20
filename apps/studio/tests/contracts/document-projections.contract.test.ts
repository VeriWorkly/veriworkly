import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  projectToResume,
  projectToCoverLetter,
  createEmptyMasterProfile,
  assertProjectionIsPure,
  type MasterProfileData,
} from "@veriworkly/profile-core";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import {
  createDefaultCoverLetter,
  createCoverLetterFromProfile,
} from "@/features/cover-letter/defaults";
import { createDocument } from "@/features/documents/services/document-workspace-service";

/**
 * The projections are the whole point of the master profile: they are the only way data
 * gets from the profile into a document, and the only thing standing between "seed a resume
 * from my profile" and "an edit in the resume editor silently rewrote my profile".
 *
 * Two invariants every projection here must satisfy, and every future one will too: it never
 * mutates its input, and it shares no reference with it.
 */

const NOW = "2026-03-01T09:00:00.000Z";

function filledMasterProfile(): MasterProfileData {
  return {
    ...createEmptyMasterProfile(),
    templateId: "modern-minimal",
    basics: {
      fullName: "Ada Lovelace",
      role: "Analytical Engineer",
      headline: "Writes algorithms for machines that do not exist yet",
      email: "ada@example.com",
      phone: "+442079460958",
      location: "London, UK",
      linkEmail: true,
      linkPhone: true,
      linkLocation: true,
    },
    links: {
      displayMode: "icon-username",
      items: [
        { id: "link-gh", type: "github", label: "GitHub", url: "https://github.com/ada" },
        { id: "link-pf", type: "portfolio", label: "", url: "https://ada.example.com" },
        { id: "link-cs", type: "custom", label: "Notes", url: "https://notes.example.com" },
      ],
    },
    summary: "Wrote the first algorithm intended for a machine.",
    experience: [
      {
        id: "exp-1",
        company: "Analytical Engine",
        role: "Collaborator",
        location: "London",
        startDate: "1842-01",
        endDate: "1843-01",
        current: false,
        summary: "Notes on the engine.",
        highlights: ["Note G"],
      },
    ],
    languages: [{ id: "lang-1", language: "English", fluency: "native" }],
    interests: [{ id: "int-1", name: "Mathematics", keywords: ["analysis"] }],
    awards: [
      {
        id: "awd-1",
        title: "First Programmer",
        awarder: "History",
        date: "1843-01",
        description: "",
        showLink: false,
      },
    ],
    certificates: [
      {
        id: "cert-1",
        title: "Engine Operator",
        issuer: "Babbage",
        date: "1842-06",
        description: "",
        showLink: false,
      },
    ],
    publications: [
      {
        id: "pub-1",
        title: "Notes by the Translator",
        publisher: "Scientific Memoirs",
        date: "1843-01",
        description: "",
        showLink: false,
      },
    ],
    volunteer: [
      {
        id: "vol-1",
        organization: "Royal Society",
        role: "Correspondent",
        startDate: "1840-01",
        endDate: "",
        current: true,
        location: "London",
        summary: "Correspondence.",
      },
    ],
    references: [
      {
        id: "ref-1",
        name: "Charles Babbage",
        title: "Inventor",
        organization: "Analytical Engine",
        email: "charles@example.com",
        phone: "+442079460959",
        relationship: "Collaborator",
      },
    ],
    achievements: [{ id: "ach-1", title: "Note G", description: "The first published algorithm." }],
    customSections: [
      {
        id: "custom-talks",
        kind: "custom",
        title: "Talks",
        editableTitle: true,
        items: [
          {
            id: "talk-1",
            name: "On the Engine",
            issuer: "Royal Society",
            date: "1843",
            link: "",
            referenceId: "",
            description: "",
            details: [],
          },
        ],
      },
    ],
  };
}

/**
 * The check every projection has to pass. Kept as a helper so adding a document type means
 * adding one line here rather than re-deriving what "does not mutate its input" means.
 */
function expectProjectionIsPure(project: (master: MasterProfileData) => unknown) {
  const master = filledMasterProfile();
  assertProjectionIsPure(project, master);
}

describe("projectToResume", () => {
  it("copies the profile's data onto a new resume", () => {
    const master = filledMasterProfile();
    const resume = projectToResume(master, { resumeId: "resume-1", now: NOW });

    expect(resume.id).toBe("resume-1");
    expect(resume.title).toBe("Ada Lovelace");
    expect(resume.updatedAt).toBe(NOW);
    expect(resume.templateId).toBe("modern-minimal");
    expect(resume.basics).toEqual(master.basics);
    expect(resume.summary).toBe(master.summary);
    expect(resume.experience).toEqual(master.experience);
  });

  it("carries every typed section array across", () => {
    const master = filledMasterProfile();
    const resume = projectToResume(master, { resumeId: "resume-1", now: NOW });

    for (const key of [
      "languages",
      "interests",
      "awards",
      "certificates",
      "publications",
      "volunteer",
      "references",
      "achievements",
      "customSections",
    ] as const) {
      expect(resume[key], `${key} must survive the projection`).toEqual(master[key]);
    }

    // The flattened model used to deliver this in a field named `date`.
    expect(resume.references[0].phone).toBe("+442079460959");
  });

  it("starts every projected resume as an unsynced local document", () => {
    const resume = projectToResume(filledMasterProfile(), { resumeId: "resume-1", now: NOW });

    expect(resume.sync).toEqual({
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    });
  });

  it("lets options override the profile's template and title", () => {
    const resume = projectToResume(filledMasterProfile(), {
      resumeId: "resume-1",
      templateId: "precision-ats",
      title: "Backend role",
      now: NOW,
    });

    expect(resume.templateId).toBe("precision-ats");
    expect(resume.title).toBe("Backend role");
  });

  it("keeps master's item ids rather than re-keying them", () => {
    const resume = projectToResume(filledMasterProfile(), { resumeId: "resume-1", now: NOW });

    expect(resume.experience[0].id).toBe("exp-1");
    expect(resume.customSections[0].id).toBe("custom-talks");
  });

  it("does not leak the profile's updatedAt into the document's", () => {
    const master = filledMasterProfile();
    master.updatedAt = "2020-01-01T00:00:00.000Z";

    expect(projectToResume(master, { resumeId: "resume-1", now: NOW }).updatedAt).toBe(NOW);
  });

  /**
   * The fork-on-create rule, enforced structurally. A shared array here would mean editing a
   * resume rewrote the profile through a reference nobody could see.
   */
  it("shares no reference with the profile it was projected from", () => {
    const master = filledMasterProfile();
    const before = structuredClone(master);
    const resume = projectToResume(master, { resumeId: "resume-1", now: NOW });

    resume.basics.fullName = "Someone Else";
    resume.experience.push({ ...resume.experience[0], id: "exp-2" });
    resume.experience[0].highlights[0] = "Rewritten";
    resume.customSections[0].items[0].name = "Rewritten";
    resume.links.items.pop();

    expect(master).toEqual(before);
  });

  it("never mutates its input", () => {
    expectProjectionIsPure((master) => projectToResume(master, { resumeId: "resume-1" }));
  });
});

describe("projectToCoverLetter", () => {
  it("fills every sender field from the profile's basics", () => {
    const master = filledMasterProfile();
    const letter = projectToCoverLetter(master, { now: NOW });

    expect(letter.senderName).toBe("Ada Lovelace");
    expect(letter.senderTitle).toBe("Analytical Engineer");
    expect(letter.senderEmail).toBe("ada@example.com");
    expect(letter.senderLocation).toBe("London, UK");
    expect(letter.signature).toBe("Ada Lovelace");
    expect(letter.links).toEqual(master.links);
  });

  it("keeps an E.164 phone number exactly as stored", () => {
    expect(projectToCoverLetter(filledMasterProfile(), { now: NOW }).senderPhone).toBe(
      "+442079460958",
    );
  });

  it("falls back to the headline when the profile has no role", () => {
    const master = filledMasterProfile();
    master.basics.role = "";

    expect(projectToCoverLetter(master, { now: NOW }).senderTitle).toBe(master.basics.headline);
  });

  it("resolves senderWebsite through portfolio, then custom, then empty", () => {
    const master = filledMasterProfile();

    expect(projectToCoverLetter(master, { now: NOW }).senderWebsite).toBe(
      "https://ada.example.com",
    );

    master.links.items = master.links.items.filter((item) => item.type !== "portfolio");
    expect(projectToCoverLetter(master, { now: NOW }).senderWebsite).toBe(
      "https://notes.example.com",
    );

    master.links.items = master.links.items.filter((item) => item.type !== "custom");
    expect(projectToCoverLetter(master, { now: NOW }).senderWebsite).toBe("");
  });

  // A portfolio row left blank must not shadow a custom link that has a url.
  it("ignores a link of the right type whose url is empty", () => {
    const master = filledMasterProfile();
    master.links.items = [
      { id: "link-pf", type: "portfolio", label: "", url: "" },
      { id: "link-cs", type: "custom", label: "Notes", url: "https://notes.example.com" },
    ];

    expect(projectToCoverLetter(master, { now: NOW }).senderWebsite).toBe(
      "https://notes.example.com",
    );
  });

  it("leaves the letter itself blank when no application is named", () => {
    const letter = projectToCoverLetter(filledMasterProfile(), { now: NOW });

    for (const key of [
      "recipientName",
      "recipientTitle",
      "companyName",
      "companyLocation",
      "jobTitle",
      "subject",
      "greeting",
      "opening",
      "body",
      "highlights",
      "closing",
      "postscript",
    ] as const) {
      expect(letter[key], `${key} must not be invented`).toBe("");
    }
  });

  it("composes the subject and greeting when the job and company are supplied", () => {
    const withoutRecipient = projectToCoverLetter(filledMasterProfile(), {
      jobTitle: "Staff Engineer",
      companyName: "Babbage Ltd",
      now: NOW,
    });

    expect(withoutRecipient.subject).toBe("Application for Staff Engineer at Babbage Ltd");
    expect(withoutRecipient.greeting).toBe("Dear Babbage Ltd Hiring Team,");
    expect(withoutRecipient.closing).toBe("Sincerely,");

    const withRecipient = projectToCoverLetter(filledMasterProfile(), {
      jobTitle: "Staff Engineer",
      companyName: "Babbage Ltd",
      recipientName: "Charles Babbage",
      now: NOW,
    });

    expect(withRecipient.greeting).toBe("Dear Charles Babbage,");
  });

  /**
   * Asserts that `projectToCoverLetter` and `createDefaultCoverLetter` share the exact same
   * appearance values derived from `DEFAULT_COVER_LETTER_APPEARANCE`.
   */
  it("starts with the same appearance a default cover letter has", () => {
    const projected = projectToCoverLetter(filledMasterProfile(), { now: NOW });

    expect(projected.appearance).toEqual(createDefaultCoverLetter("cl-1").content.appearance);
  });

  /**
   * The master customization is resume page geometry — section spacing, page padding,
   * heading line height — and means nothing for a letter, so none of it may leak in.
   */
  it("does not inherit the profile's resume page geometry", () => {
    const master = filledMasterProfile();
    master.customization.pagePadding = 96;

    const appearance = projectToCoverLetter(master, { now: NOW }).appearance;

    expect(Object.keys(appearance).sort()).toEqual([
      "accentColor",
      "fontFamily",
      "hiddenSections",
      "lineHeight",
      "pageColor",
      "pageMargin",
      "paragraphSpacing",
      "sidebarColor",
      "textColor",
    ]);
  });

  it("shares no reference with the profile it was projected from", () => {
    const master = filledMasterProfile();
    const before = structuredClone(master);
    const letter = projectToCoverLetter(master, { now: NOW });

    letter.links.items.pop();
    letter.links.displayMode = "url";
    letter.appearance.hiddenSections.push("links");

    expect(master).toEqual(before);
  });

  it("never mutates its input", () => {
    expectProjectionIsPure((master) => projectToCoverLetter(master));
  });
});

describe("cover letter creation", () => {
  function createLocalStorageMock() {
    const store = new Map<string, string>();

    return {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(() => {
        store.clear();
      }),
    };
  }

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

  it("wraps the projection in a document envelope", () => {
    const document = createCoverLetterFromProfile("cl-1", filledMasterProfile());

    expect(document.id).toBe("cl-1");
    expect(document.type).toBe("COVER_LETTER");
    expect(document.templateId).toBe("professional");
    expect(document.sync.status).toBe("local-only");
    expect(document.content.senderName).toBe("Ada Lovelace");
    // A letter with no target has nothing truthful to be named after yet.
    expect(document.title).toBe("Untitled Cover Letter");
  });

  it("narrows the font id through the studio's catalog", () => {
    const document = createCoverLetterFromProfile("cl-1", filledMasterProfile());

    expect(document.content.appearance.fontFamily).toBe("geist");
  });

  it("seeds a new cover letter from the profile it is handed", () => {
    const content = createDocument("COVER_LETTER", filledMasterProfile())
      .content as CoverLetterContent;

    expect(content.senderName).toBe("Ada Lovelace");
    expect(content.senderEmail).toBe("ada@example.com");
    expect(content.body).toBe("");
  });

  /**
   * With no profile the sample letter is the honest answer: a letter is signed, so projecting
   * the studio's "VeriWorkly User" placeholder would put a name on it that is nobody's.
   */
  it("falls back to the sample letter when there is no profile", () => {
    const content = createDocument("COVER_LETTER").content as CoverLetterContent;

    expect(content.senderName).toBe(createDefaultCoverLetter("cl-1").content.senderName);
  });

  it("seeds a new resume from the profile it is handed", () => {
    const resume = createDocument("RESUME", filledMasterProfile()).content as ResumeData;

    expect(resume.basics.fullName).toBe("Ada Lovelace");
    expect(resume.references[0].phone).toBe("+442079460959");
  });
});
