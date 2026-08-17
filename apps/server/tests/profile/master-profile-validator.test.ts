import { describe, expect, it } from "vitest";

import { masterProfilePayloadSchema } from "../../src/validators/masterProfileValidator";

const validPayload = {
  expectedUpdatedAt: "2026-04-10T10:00:00.000Z",
  profile: {
    templateId: "modern",
    basics: {
      fullName: "Test User",
      role: "Engineer",
      headline: "Builds products",
      email: "test@example.com",
      phone: "5550001234",
      location: "Remote",
      linkEmail: true,
      linkPhone: true,
      linkLocation: true,
    },
    links: {
      displayMode: "icon",
      items: [
        {
          id: "link-1",
          type: "github",
          label: "GitHub",
          url: "https://github.com/test",
        },
      ],
    },
    summary: "Summary",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    interests: [],
    awards: [],
    certificates: [],
    publications: [],
    volunteer: [],
    references: [],
    achievements: [],
    customSections: [],
    sections: [
      {
        id: "basics",
        label: "Basics",
        visible: true,
        order: 0,
      },
    ],
    customization: {
      accentColor: "#2563eb",
      textColor: "#0f172a",
      mutedTextColor: "#64748b",
      pageBackgroundColor: "#ffffff",
      sectionBackgroundColor: "#f8fafc",
      borderColor: "#cbd5e1",
      sectionHeadingColor: "#1e293b",
      fontFamily: "geist",
      sectionSpacing: 24,
      pagePadding: 24,
      bodyLineHeight: 1.5,
      headingLineHeight: 1.2,
    },
    updatedAt: "2026-04-10T10:00:00.000Z",
  },
};

describe("masterProfilePayloadSchema contract", () => {
  it("accepts a valid profile payload", () => {
    const result = masterProfilePayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("strips unknown keys in the root payload", () => {
    const result = masterProfilePayloadSchema.safeParse({
      ...validPayload,
      unexpected: true,
    });

    // Deliberately `.strip()` rather than `.strict()`: a client deployed ahead of the
    // server must degrade to "the new field is ignored", not to a hard 400 on every save.
    // See the deploy-order note on `masterProfileContentSchema`.
    expect(result.success).toBe(true);
    expect(result.success && "unexpected" in result.data).toBe(false);
  });

  it("rejects malformed nested fields", () => {
    const result = masterProfilePayloadSchema.safeParse({
      ...validPayload,
      profile: {
        ...validPayload.profile,
        basics: {
          ...validPayload.profile.basics,
          email: "not-an-email",
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed phone, URL, and dates", () => {
    const result = masterProfilePayloadSchema.safeParse({
      ...validPayload,
      profile: {
        ...validPayload.profile,
        basics: {
          ...validPayload.profile.basics,
          phone: "123",
        },
        links: {
          ...validPayload.profile.links,
          items: [
            {
              ...validPayload.profile.links.items[0],
              url: "github.com/test",
            },
          ],
        },
        education: [
          {
            id: "edu-1",
            school: "School",
            degree: "Degree",
            field: "Field",
            startDate: "2024-01",
            endDate: "abcd",
            current: false,
            summary: "",
          },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  /*
   * Mirror of the studio's table in
   * apps/studio/tests/contracts/master-profile.contract.test.ts. Both sides must agree on
   * every row: a value the client accepts and the server rejects is a 400 the user only
   * ever sees as a spinner that stops.
   */
  describe("phone rules match the studio's", () => {
    const cases: Array<{ input: string; valid: boolean }> = [
      { input: "", valid: true },
      { input: "+442079460958", valid: true },
      { input: "+44 20 7946 0958", valid: true },
      { input: "+919876543210", valid: true },
      { input: "+1 (415) 555-2671", valid: true },
      { input: "9876543210", valid: true },
      { input: "0000000000", valid: true },
      { input: "123", valid: false },
      { input: "+999999999999999999", valid: false },
      { input: "notaphone", valid: false },
      // 555-010 is a fictional US exchange, so the number does not exist.
      { input: "+1 (555) 010-2026", valid: false },
    ];

    for (const { input, valid } of cases) {
      it(`${valid ? "accepts" : "rejects"} ${JSON.stringify(input)}`, () => {
        const result = masterProfilePayloadSchema.safeParse({
          ...validPayload,
          profile: {
            ...validPayload.profile,
            basics: { ...validPayload.profile.basics, phone: input },
          },
        });

        expect(result.success).toBe(valid);
      });
    }
  });
});
