import { describe, expect, it } from "vitest";

import {
  createEmptyMasterProfile,
  normalizeMasterProfile,
  sanitizeMasterProfileForSave,
} from "@veriworkly/profile-core";

import { masterProfilePayloadSchema } from "../../src/validators/masterProfileValidator";

/**
 * The studio -> server round trip for the master profile.
 *
 * The studio normalises a profile with its own hand-copied schema and PUTs it here; the two
 * schemas are separate files that have already drifted. This fixture mirrors what the
 * studio's `normalizeProfile()` produces from its default profile — built by hand rather
 * than imported, because apps must not import across app boundaries. When the studio's
 * default shape changes, this fixture has to change with it, and that is the point: the
 * failure surfaces here instead of as a 400 the user sees as a stuck spinner.
 */
function buildStudioNormalizedProfile() {
  return {
    templateId: "executive-clarity",
    basics: {
      fullName: "VeriWorkly User",
      role: "Indie Developer & Product Builder",
      headline: "Building useful, fast, and privacy-first web products.",
      email: "hello@veriworkly.com",
      phone: "0000000000",
      location: "Internet (occasionally Earth)",
      linkEmail: true,
      linkPhone: true,
      linkLocation: false,
    },
    links: {
      displayMode: "icon-username",
      items: [
        {
          id: "link-1",
          type: "github",
          label: "GitHub",
          url: "https://github.com/VeriWorkly/veriworkly",
        },
      ],
    },
    summary: "Builds products end to end.",
    experience: [
      {
        id: "experience-1",
        company: "VeriWorkly",
        role: "Founder",
        location: "Remote",
        startDate: "2024-01",
        endDate: "",
        current: true,
        summary: "Runs the product.",
        highlights: ["Shipped the studio"],
      },
    ],
    education: [
      {
        id: "education-1",
        school: "University",
        degree: "B.Tech",
        field: "Computer Science",
        startDate: "2019",
        endDate: "2023",
        current: false,
        summary: "",
      },
    ],
    projects: [
      {
        id: "project-1",
        name: "VeriWorkly",
        role: "Creator",
        link: "https://veriworkly.com",
        linkLabel: "Link",
        showLinkAsText: true,
        summary: "Resume studio.",
        highlights: [],
        skills: [],
      },
    ],
    skills: [{ id: "skill-1", name: "Engineering", keywords: ["TypeScript"] }],
    languages: [],
    interests: [],
    awards: [],
    certificates: [],
    publications: [],
    volunteer: [],
    references: [],
    achievements: [],
    customSections: [
      {
        id: "custom-default",
        kind: "custom",
        title: "Custom Section",
        editableTitle: true,
        items: [],
      },
    ],
    sections: [
      { id: "basics", label: "Basics", visible: true, order: 0 },
      { id: "summary", label: "Summary", visible: true, order: 1 },
    ],
    customization: {
      accentColor: "#2563eb",
      textColor: "#0f172a",
      mutedTextColor: "#475569",
      pageBackgroundColor: "#ffffff",
      sectionBackgroundColor: "#ffffff",
      borderColor: "#cbd5e1",
      sectionHeadingColor: "#334155",
      fontFamily: "geist",
      sectionSpacing: 28,
      pagePadding: 32,
      bodyLineHeight: 1.5,
      headingLineHeight: 1.2,
    },
    updatedAt: "2026-04-10T10:00:00.000Z",
  };
}

describe("master profile studio round trip", () => {
  it("accepts a profile shaped the way the studio normalises it", () => {
    const result = masterProfilePayloadSchema.safeParse({
      profile: buildStudioNormalizedProfile(),
    });

    expect(result.success).toBe(true);
  });

  it("strips unknown keys instead of rejecting the whole payload", () => {
    const result = masterProfilePayloadSchema.safeParse({
      profile: {
        ...buildStudioNormalizedProfile(),
        // A stray key like this used to be fatal: `.strict()` here against the studio's
        // `.passthrough()` meant one unrecognised field turned every subsequent save into
        // a permanent 400. The import pipeline wrote exactly this one.
        sync: { enabled: false, status: "local-only" },
      },
    });

    expect(result.success).toBe(true);
    expect(result.success && "sync" in result.data.profile).toBe(false);
  });

  it("rejects a section spacing outside the shared range", () => {
    const profile = buildStudioNormalizedProfile();

    const result = masterProfilePayloadSchema.safeParse({
      profile: {
        ...profile,
        customization: { ...profile.customization, sectionSpacing: 150 },
      },
    });

    // The client's `validateMasterProfileForSave` now rejects 150 with the same 0..120
    // bound, so the UI can no longer offer a value that dies here.
    expect(result.success).toBe(false);
  });

  it("accepts a profile with no phone and no email", () => {
    const profile = buildStudioNormalizedProfile();

    const result = masterProfilePayloadSchema.safeParse({
      profile: {
        ...profile,
        basics: { ...profile.basics, phone: "", email: "" },
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts an E.164 phone number", () => {
    const profile = buildStudioNormalizedProfile();

    const result = masterProfilePayloadSchema.safeParse({
      profile: {
        ...profile,
        basics: { ...profile.basics, phone: "+442079460958" },
      },
    });

    expect(result.success).toBe(true);
  });
});

describe("saving a master profile no longer mirrors its typed sections", () => {
  it("leaves customSections holding only genuinely custom entries", () => {
    const profile = {
      ...createEmptyMasterProfile(),
      certificates: [
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
      ],
      references: [
        {
          id: "ref-1",
          name: "Ada Lovelace",
          title: "Head of Engineering",
          organization: "Analytical Engines",
          email: "ada@example.com",
          phone: "+442079460958",
          relationship: "Former manager",
        },
      ],
    };

    const sanitized = sanitizeMasterProfileForSave(profile);

    // The mirror used to rebuild eight sections here on every save, flattening the phone
    // above into a field called `date` and the certificate's website into `link`.
    expect(sanitized.customSections.every((section) => section.kind === "custom")).toBe(true);
    expect(sanitized.certificates[0].referenceId).toBe("CRED-99182");
    expect(sanitized.references[0].phone).toBe("+442079460958");
  });

  it("strips a mirror left behind by a profile stored before the typed model", () => {
    const legacy = {
      ...createEmptyMasterProfile(),
      languages: [],
      customSections: [
        {
          id: "languages-default",
          kind: "languages" as const,
          title: "Languages",
          editableTitle: false,
          items: [
            {
              id: "lang-1",
              name: "English",
              issuer: "native",
              date: "",
              link: "",
              referenceId: "",
              description: "native",
              details: [],
            },
          ],
        },
        {
          id: "custom-a",
          kind: "custom" as const,
          title: "Speaking",
          editableTitle: true,
          items: [],
        },
      ],
    };

    // Normalisation is what migrates; sanitising afterwards is what drops the husk.
    const normalized = normalizeMasterProfile(legacy);

    expect(normalized.languages).toEqual([
      { id: "lang-1", language: "English", fluency: "native" },
    ]);
    expect(sanitizeMasterProfileForSave(normalized).customSections.map((s) => s.id)).toEqual([
      "custom-a",
    ]);
  });
});
