import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  migrateMasterProfile,
  normalizeMasterProfile,
  parseMasterProfile,
  createEmptyMasterProfile,
  NewerSchemaVersionError,
  assertProjectionIsPure,
  projectToResume,
} from "@veriworkly/profile-core";

describe("Phase 9: Schema Versioning and Migration Pipeline", () => {
  it("defaults new profiles to CURRENT_SCHEMA_VERSION (2)", () => {
    const empty = createEmptyMasterProfile();
    expect(empty.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(empty.schemaVersion).toBe(2);
  });

  it("migrates unversioned legacy payload to v2 and stamps schemaVersion: 2", () => {
    const legacyPayload = {
      basics: {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: "+12025550123",
      },
      customSections: [
        {
          id: "legacy-awards",
          kind: "awards",
          title: "Awards",
          items: [
            {
              id: "item-1",
              name: "Innovator Award",
              issuer: "Tech Org",
              date: "2024-05",
              link: "https://example.com/award",
              referenceId: "",
              description: "Won top prize",
              details: [],
            },
          ],
        },
        {
          id: "custom-patents",
          kind: "custom",
          title: "Patents",
          items: [
            {
              id: "patent-1",
              name: "Quantum Logic Cell",
              issuer: "USPTO",
              date: "2025",
              link: "https://patents.example.com",
              referenceId: "US-9999",
              description: "Novel quantum logic gates",
              details: [],
            },
          ],
        },
      ],
    };

    const normalized = normalizeMasterProfile(legacyPayload);

    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.awards).toHaveLength(1);
    expect(normalized.awards[0].title).toBe("Innovator Award");
    expect(normalized.awards[0].awarder).toBe("Tech Org");
    // Mirrored compatibility custom section is cleaned out, genuine custom section survives
    expect(normalized.customSections).toHaveLength(1);
    expect(normalized.customSections[0].id).toBe("custom-patents");
    expect(normalized.customSections[0].title).toBe("Patents");
  });

  it("throws NewerSchemaVersionError when encountering a future schema version in migrateMasterProfile", () => {
    const futurePayload = {
      schemaVersion: 99,
      basics: {
        fullName: "Time Traveler",
      },
    };

    expect(() => migrateMasterProfile(futurePayload)).toThrowError(NewerSchemaVersionError);
  });

  it("validates and parses v2 master profile cleanly", () => {
    const profile = createEmptyMasterProfile();
    profile.basics.fullName = "Test User";
    profile.basics.email = "test@example.com";

    const parsed = parseMasterProfile(profile);
    expect(parsed).not.toBeNull();
    expect(parsed?.schemaVersion).toBe(2);
    expect(parsed?.basics.fullName).toBe("Test User");
  });

  it("assertProjectionIsPure verifies purity and isolates mutations", () => {
    const fixture = createEmptyMasterProfile();
    fixture.basics.fullName = "Pure Test";
    fixture.basics.email = "pure@example.com";

    const resume = assertProjectionIsPure(
      (master) => projectToResume(master, { resumeId: "res-1" }),
      fixture,
    );

    expect(resume.basics.fullName).toBe("Pure Test");
    expect(resume.schemaVersion).toBe(2);
  });
});
