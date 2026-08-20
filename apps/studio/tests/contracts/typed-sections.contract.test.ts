import { describe, expect, it } from "vitest";

import { unflattenLegacySections } from "@veriworkly/profile-core";

import type { ResumeData } from "@/types/resume";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { parseResumeDataInput } from "@/features/resume/schemas/resume-storage-schema";
import {
  getResumeAdditionalBlocks,
  getLanguageRenderItems,
  getReferenceRenderItems,
  getVolunteerRenderItems,
} from "@/features/documents/rendering/resume-render-items";

/**
 * A resume as it was stored before the typed section model: every optional section squeezed
 * into `customSections`, each item in the shared flat shape. This is what the migration has
 * to read, and the awkward fields are deliberate — the reference's phone is in `date`, its
 * email is a `mailto:` in `link`, and the volunteer's dates are one concatenated string.
 */
function legacyStoredResume(): Partial<ResumeData> {
  return {
    ...defaultResume,
    // Cast: this is the pre-migration shape, which the current type no longer describes.
    customSections: [
      {
        id: "certifications-default",
        kind: "certifications",
        title: "Certifications",
        editableTitle: false,
        items: [
          {
            id: "cert-1",
            name: "AWS Certified Developer",
            issuer: "Amazon Web Services",
            date: "2024-06",
            link: "https://verify.example.com/aws-cert",
            referenceId: "CRED-99182",
            description: "Associate level certification.",
            details: [],
          },
        ],
      },
      {
        id: "languages-default",
        kind: "languages",
        title: "Languages",
        editableTitle: false,
        items: [
          {
            id: "lang-1",
            name: "English",
            issuer: "",
            date: "",
            link: "",
            // The resume editor's proficiency list wrote here, in its own vocabulary.
            referenceId: "Native",
            description: "",
            details: [],
          },
        ],
      },
      {
        id: "volunteer-default",
        kind: "volunteer",
        title: "Volunteer",
        editableTitle: false,
        items: [
          {
            id: "vol-1",
            name: "Code Club",
            issuer: "Mentor",
            date: "2020-01 - Present",
            link: "",
            referenceId: "",
            description: "Weekly sessions for secondary students.",
            details: ["Bengaluru"],
          },
        ],
      },
      {
        id: "references-default",
        kind: "references",
        title: "References",
        editableTitle: false,
        items: [
          {
            id: "ref-1",
            name: "Ada Lovelace",
            issuer: "Analytical Engines",
            date: "",
            link: "mailto:ada@example.com",
            referenceId: "",
            description: "Head of Engineering / Former manager",
            details: ["+442079460958"],
          },
        ],
      },
      {
        id: "custom-a",
        kind: "custom",
        title: "Speaking",
        editableTitle: true,
        items: [
          {
            id: "talk-1",
            name: "Scaling type systems",
            issuer: "",
            date: "",
            link: "",
            referenceId: "",
            description: "",
            details: [],
          },
        ],
      },
      {
        id: "custom-b",
        kind: "custom",
        title: "Patents",
        editableTitle: true,
        items: [],
      },
    ] as ResumeData["customSections"],
  };
}

describe("legacy flattened sections migrate to the typed model", () => {
  it("unflattens each section into the field its label always claimed", () => {
    const resume = normalizeResumeData(legacyStoredResume());

    expect(resume.certificates).toEqual([
      {
        id: "cert-1",
        title: "AWS Certified Developer",
        issuer: "Amazon Web Services",
        date: "2024-06",
        website: "https://verify.example.com/aws-cert",
        referenceId: "CRED-99182",
        description: "Associate level certification.",
        showLink: true,
      },
    ]);

    // The editor's "Native" maps onto the schema enum rather than being stored as free text.
    expect(resume.languages).toEqual([{ id: "lang-1", language: "English", fluency: "native" }]);

    // "2020-01 - Present" becomes two dates and a `current` flag.
    expect(resume.volunteer).toEqual([
      {
        id: "vol-1",
        organization: "Code Club",
        role: "Mentor",
        startDate: "2020-01",
        endDate: "",
        current: true,
        location: "Bengaluru",
        summary: "Weekly sessions for secondary students.",
      },
    ]);

    // The three awkward ones: phone out of `date`, email out of a `mailto:` link, and
    // title/relationship out of a slash-joined description.
    expect(resume.references).toEqual([
      {
        id: "ref-1",
        name: "Ada Lovelace",
        title: "Head of Engineering",
        organization: "Analytical Engines",
        relationship: "Former manager",
        email: "ada@example.com",
        phone: "+442079460958",
      },
    ]);
  });

  it("recovers a phone the resume editor wrote into `date`", () => {
    // The editor's own shape, which disagrees with the profile mirror: relationship in
    // `referenceId`, title in `issuer`, organization in `description`, phone in `date`.
    const typed = unflattenLegacySections({
      customSections: [
        {
          id: "references-default",
          kind: "references",
          title: "References",
          items: [
            {
              id: "ref-2",
              name: "Grace Hopper",
              issuer: "Rear Admiral",
              date: "+15550102026",
              link: "grace@example.com",
              referenceId: "Former manager",
              description: "US Navy",
              details: [],
            },
          ],
        },
      ],
    });

    expect(typed.references[0]).toEqual({
      id: "ref-2",
      name: "Grace Hopper",
      title: "Rear Admiral",
      organization: "US Navy",
      relationship: "Former manager",
      email: "grace@example.com",
      phone: "+15550102026",
    });
  });

  it("keeps every custom section and drops only the mirrored ones", () => {
    const resume = normalizeResumeData(legacyStoredResume());

    expect(resume.customSections.map((section) => section.title)).toEqual(["Speaking", "Patents"]);
    expect(resume.customSections.every((section) => section.kind === "custom")).toBe(true);

    expect(
      resume.sections
        .filter((section) => section.id === "custom")
        .map((section) => section.customSectionId),
    ).toEqual(["custom-a", "custom-b"]);
  });

  it("migrates through the storage parser too, not only the normaliser", () => {
    // `parseResumeDataInput` is the read path for localStorage and for JSON import, so a
    // legacy file dragged in has to come back typed the same way a stored document does.
    const parsed = parseResumeDataInput(legacyStoredResume());

    expect(parsed).not.toBeNull();
    expect(parsed?.references[0].phone).toBe("+442079460958");
    expect(parsed?.certificates[0].referenceId).toBe("CRED-99182");
    expect(parsed?.customSections.map((section) => section.title)).toEqual(["Speaking", "Patents"]);
  });

  it("is a no-op on a resume that has already migrated", () => {
    const once = normalizeResumeData(legacyStoredResume());
    const twice = normalizeResumeData(once);

    expect(twice.certificates).toEqual(once.certificates);
    expect(twice.references).toEqual(once.references);
    expect(twice.customSections).toEqual(once.customSections);
  });

  it("normalises to empty arrays without throwing when there is nothing to migrate", () => {
    const resume = normalizeResumeData({ ...defaultResume, customSections: [] });

    expect(resume.certificates).toEqual([]);
    expect(resume.references).toEqual([]);
    expect(resume.customSections).toEqual([]);
    expect(() => normalizeResumeData({} as Partial<ResumeData>)).not.toThrow();
    expect(() => normalizeResumeData(null)).not.toThrow();
  });
});

describe("typed sections render as what they are", () => {
  it("prints a reference's phone as a phone and its email as a mailto link", () => {
    const resume = normalizeResumeData(legacyStoredResume());
    const [item] = getReferenceRenderItems(resume.references);

    expect(item.title).toBe("Ada Lovelace");
    expect(item.meta).toBe("+442079460958");
    expect(item.subtitle).toBe("Head of Engineering | Analytical Engines");
    expect(item.link).toEqual({ href: "mailto:ada@example.com", text: "ada@example.com" });
  });

  it("prints a language with its fluency and a volunteer entry with a real date range", () => {
    const resume = normalizeResumeData(legacyStoredResume());

    expect(getLanguageRenderItems(resume.languages)[0]).toMatchObject({
      title: "English",
      subtitle: "Native",
    });

    const [volunteer] = getVolunteerRenderItems(resume.volunteer);

    expect(volunteer.title).toBe("Code Club");
    expect(volunteer.subtitle).toBe("Mentor | Bengaluru");
    expect(volunteer.meta).toContain("Present");
  });

  it("emits a block for every typed and custom section that has content", () => {
    const resume = normalizeResumeData(legacyStoredResume());
    const blocks = getResumeAdditionalBlocks(resume);
    const titles = blocks.map((block) => block.title);

    expect(titles).toContain("Certifications");
    expect(titles).toContain("Languages");
    expect(titles).toContain("Volunteer");
    expect(titles).toContain("References");
    // "Patents" has no items, so it is dropped; "Speaking" has one and survives.
    expect(titles).toContain("Speaking");
    expect(titles).not.toContain("Patents");

    // Awards and publications are empty, so they are not emitted at all.
    expect(titles).not.toContain("Awards");
    expect(titles).not.toContain("Publications");

    // Block keys are unique — several sections share the id "custom".
    expect(new Set(blocks.map((block) => block.key)).size).toBe(blocks.length);
  });

  it("hides one custom section without hiding the others", () => {
    const resume = normalizeResumeData(legacyStoredResume());

    const withHidden: ResumeData = {
      ...resume,
      sections: resume.sections.map((section) =>
        section.customSectionId === "custom-a" ? { ...section, visible: false } : section,
      ),
    };

    const titles = getResumeAdditionalBlocks(withHidden).map((block) => block.title);

    expect(titles).not.toContain("Speaking");
    expect(titles).toContain("Certifications");
  });
});
