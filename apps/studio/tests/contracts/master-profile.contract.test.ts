import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { MasterProfileData, ResumeData } from "@/types/resume";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { getContactItems } from "@/features/documents/rendering/resume-rendering";
import { validateMasterProfileForSave } from "@/features/profile/components/master/master-utils";
import {
  isValidPhoneValue,
  normalizePhoneValue,
} from "@/features/resume/schemas/resume-validation-rules";
import {
  getMasterProfile,
  salvageMasterProfile,
  deriveResumeFromMasterProfile,
  loadMasterProfileFromDatabase,
  loadMasterProfileFromLocalStorage,
  saveMasterProfileToLocalStorage,
} from "@/features/resume/services/master-profile";

/**
 * Contract for the master-profile storage round trip.
 *
 * Several files hand-copy the master-profile schema, so a change to any one of them shows
 * up here as a behaviour change rather than as a silent 400 or a silently reset profile —
 * which is how these bugs used to reach users. The two properties that matter most are the
 * ones nothing else enforces: the stored bytes are never destroyed, and an incomplete
 * profile is still a storable profile.
 */

const CORRUPT_KEY = `${MASTER_PROFILE_STORAGE_KEY}:corrupt`;

const fetchApiDataMock = vi.hoisted(() => vi.fn());

vi.mock("@/utils/fetchApiData", () => ({
  fetchApiData: fetchApiDataMock,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

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

/**
 * Mirror of the service's private `getDefaultProfile()` — the master-profile-shaped subset
 * of `defaultResume`. Duplicated rather than exported so a change to the service's notion
 * of "default" is a test failure instead of a silently agreeing tautology.
 */
function buildMasterProfile(overrides: Partial<MasterProfileData> = {}): MasterProfileData {
  const base = structuredClone(defaultResume) as ResumeData;

  return {
    schemaVersion: 2,
    templateId: base.templateId,
    basics: base.basics,
    links: base.links,
    summary: base.summary,
    experience: base.experience,
    education: base.education,
    projects: base.projects,
    skills: base.skills,
    languages: [],
    interests: [],
    awards: [],
    certificates: [],
    publications: [],
    volunteer: [],
    references: [],
    achievements: [],
    customSections: base.customSections,
    sections: base.sections,
    customization: base.customization,
    updatedAt: base.updatedAt,
    ...overrides,
  } as MasterProfileData;
}

function storeMasterProfile(profile: MasterProfileData) {
  window.localStorage.setItem(
    MASTER_PROFILE_STORAGE_KEY,
    JSON.stringify({ updatedAt: new Date().toISOString(), profile }),
  );
}

function withoutUpdatedAt(profile: MasterProfileData) {
  const rest: Partial<MasterProfileData> = { ...profile };
  delete rest.updatedAt;

  return rest;
}

describe("master profile storage contract", () => {
  beforeEach(() => {
    const localStorageMock = createLocalStorageMock();

    fetchApiDataMock.mockReset();

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", { localStorage: localStorageMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the defaultResume-derived profile when nothing is stored", () => {
    const { profile } = loadMasterProfileFromLocalStorage();

    expect(profile.basics.fullName).toBe(defaultResume.basics.fullName);
    expect(profile.summary).toBe(defaultResume.summary);
    expect(profile.templateId).toBe(defaultResume.templateId);
  });

  it("keeps a stored profile whose phone is empty", () => {
    storeMasterProfile(
      buildMasterProfile({
        basics: { ...defaultResume.basics, fullName: "Ada Lovelace", phone: "" },
      }),
    );

    const { profile } = loadMasterProfileFromLocalStorage();

    expect(profile.basics.fullName).toBe("Ada Lovelace");
    expect(profile.basics.phone).toBe("");
    expect(window.localStorage.getItem(MASTER_PROFILE_STORAGE_KEY)).not.toBeNull();
  });

  it("keeps a stored profile whose email is empty", () => {
    storeMasterProfile(
      buildMasterProfile({
        basics: { ...defaultResume.basics, fullName: "Ada Lovelace", email: "" },
      }),
    );

    const { profile } = loadMasterProfileFromLocalStorage();

    expect(profile.basics.fullName).toBe("Ada Lovelace");
    expect(profile.basics.email).toBe("");
    expect(window.localStorage.getItem(MASTER_PROFILE_STORAGE_KEY)).not.toBeNull();
  });

  it("round-trips a fully valid profile through save and load without mutating it", () => {
    const profile = buildMasterProfile({
      basics: { ...defaultResume.basics, fullName: "Grace Hopper", role: "Rear Admiral" },
      summary: "Invented the compiler.",
    });

    saveMasterProfileToLocalStorage(profile);

    const { profile: loaded } = loadMasterProfileFromLocalStorage();

    expect(withoutUpdatedAt(loaded)).toEqual(withoutUpdatedAt(profile));
  });

  it("keeps an international phone number intact across save, load, and derive", () => {
    const profile = buildMasterProfile({
      basics: { ...defaultResume.basics, phone: "+44 20 7946 0958" },
    });

    saveMasterProfileToLocalStorage(profile);

    const { profile: loaded } = loadMasterProfileFromLocalStorage();
    const resume = deriveResumeFromMasterProfile("resume-intl", loaded);

    expect(loaded.basics.phone).toBe("+44 20 7946 0958");
    expect(resume.basics.phone).toBe("+44 20 7946 0958");
  });

  it("derives a resume whose content matches the stored master profile", () => {
    const profile = buildMasterProfile({
      basics: { ...defaultResume.basics, fullName: "Katherine Johnson" },
      summary: "Computed trajectories for Mercury and Apollo.",
    });

    storeMasterProfile(profile);

    const resume = deriveResumeFromMasterProfile(
      "resume-derived",
      loadMasterProfileFromLocalStorage().profile,
    );

    expect(resume.id).toBe("resume-derived");
    expect(resume.basics).toEqual(profile.basics);
    expect(resume.links).toEqual(profile.links);
    expect(resume.experience).toEqual(profile.experience);
    expect(resume.education).toEqual(profile.education);
    expect(resume.projects).toEqual(profile.projects);
    expect(resume.skills).toEqual(profile.skills);
  });

  it("carries every custom section through to the derived resume", () => {
    const customSections = [
      {
        id: "custom-a",
        kind: "custom" as const,
        title: "Speaking",
        items: [],
        editableTitle: true,
      },
      { id: "custom-b", kind: "custom" as const, title: "Patents", items: [], editableTitle: true },
      { id: "custom-c", kind: "custom" as const, title: "Press", items: [], editableTitle: true },
    ];

    storeMasterProfile(buildMasterProfile({ customSections }));

    const resume = deriveResumeFromMasterProfile(
      "resume-custom",
      loadMasterProfileFromLocalStorage().profile,
    );

    expect(resume.customSections.map((section) => section.title)).toEqual([
      "Speaking",
      "Patents",
      "Press",
    ]);

    // Each gets its own orderable, toggleable entry in the sections list, addressed by id.
    expect(
      resume.sections
        .filter((section) => section.id === "custom")
        .map((section) => section.customSectionId),
    ).toEqual(["custom-a", "custom-b", "custom-c"]);
  });

  it("carries the typed optional sections through to the derived resume", () => {
    const profile = buildMasterProfile({
      languages: [
        { id: "lang-1", language: "Telugu", fluency: "native" },
        { id: "lang-2", language: "German", fluency: "limited" },
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
        {
          id: "ref-2",
          name: "Grace Hopper",
          title: "Rear Admiral",
          organization: "US Navy",
          email: "grace@example.com",
          phone: "+14155552671",
          relationship: "Mentor",
        },
      ],
      volunteer: [
        {
          id: "vol-1",
          organization: "Code Club",
          role: "Mentor",
          startDate: "2020-01",
          endDate: "2023-06",
          current: false,
          location: "Bengaluru",
          summary: "Weekly sessions for secondary students.",
        },
      ],
    });

    storeMasterProfile(profile);

    const resume = deriveResumeFromMasterProfile(
      "resume-typed",
      loadMasterProfileFromLocalStorage().profile,
    );

    expect(resume.languages).toEqual(profile.languages);
    // A real date range, not the "2020-01 - Present" display string the mirror produced.
    expect(resume.volunteer).toEqual(profile.volunteer);
    // Both references keep both contact fields. The mirror had one slot for each, so the
    // phone landed in a property called `date` and the email in one called `link`.
    expect(resume.references).toEqual(profile.references);
  });
});

describe("master profile phone rules", () => {
  // The mirror of this table lives in apps/server/tests/profile/master-profile-validator.test.ts.
  // The two sides must agree exactly; a value one accepts and the other rejects is a 400
  // the user only ever sees as a spinner that stops.
  const cases: Array<{ input: string; valid: boolean; normalized: string }> = [
    { input: "", valid: true, normalized: "" },
    { input: "+442079460958", valid: true, normalized: "+442079460958" },
    { input: "+44 20 7946 0958", valid: true, normalized: "+442079460958" },
    { input: "+919876543210", valid: true, normalized: "+919876543210" },
    { input: "+1 (415) 555-2671", valid: true, normalized: "+14155552671" },
    { input: "9876543210", valid: true, normalized: "9876543210" },
    { input: "0000000000", valid: true, normalized: "0000000000" },
    { input: "123", valid: false, normalized: "123" },
    // Punctuation is stripped on normalisation either way, but 555-010 is a fictional US
    // exchange, so the number itself does not exist and libphonenumber says so.
    { input: "+1 (555) 010-2026", valid: false, normalized: "+15550102026" },
    { input: "+999999999999999999", valid: false, normalized: "+999999999999999999" },
    { input: "notaphone", valid: false, normalized: "notaphone" },
  ];

  for (const { input, valid, normalized } of cases) {
    it(`${valid ? "accepts" : "rejects"} ${JSON.stringify(input)}`, () => {
      expect(isValidPhoneValue(input)).toBe(valid);
      expect(normalizePhoneValue(input)).toBe(normalized);
    });
  }

  it("renders an E.164 number as a valid tel: URI", () => {
    const [contact] = getContactItems({
      ...defaultResume.basics,
      email: "",
      location: "",
      phone: "+442079460958",
      linkPhone: true,
    });

    expect(contact.href).toBe("tel:+442079460958");
  });
});

describe("master profile lifecycle", () => {
  beforeEach(() => {
    const localStorageMock = createLocalStorageMock();

    fetchApiDataMock.mockReset();

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", { localStorage: localStorageMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caches the database profile locally so document creation can see it", async () => {
    fetchApiDataMock.mockResolvedValue({
      profile: {
        id: "profile-1",
        userId: "user-1",
        content: buildMasterProfile({
          basics: { ...defaultResume.basics, fullName: "Barbara Liskov" },
        }),
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      summary: null,
    });

    const result = await loadMasterProfileFromDatabase();

    expect(result.status).toBe("ok");
    expect(window.localStorage.getItem(MASTER_PROFILE_STORAGE_KEY)).not.toBeNull();
    expect(loadMasterProfileFromLocalStorage().profile.basics.fullName).toBe("Barbara Liskov");
  });

  it("falls back to the local cache when the database is unreachable", async () => {
    storeMasterProfile(
      buildMasterProfile({ basics: { ...defaultResume.basics, fullName: "Margaret Hamilton" } }),
    );

    fetchApiDataMock.mockRejectedValue(new Error("network down"));

    const result = await loadMasterProfileFromDatabase();
    const profile = await getMasterProfile();

    expect(result.status).toBe("error");
    expect(profile.basics.fullName).toBe("Margaret Hamilton");
  });

  it("backs up an unreadable stored value instead of deleting it", () => {
    window.localStorage.setItem(MASTER_PROFILE_STORAGE_KEY, "{ not json");

    const { profile } = loadMasterProfileFromLocalStorage();

    expect(profile.basics.fullName).toBe(defaultResume.basics.fullName);
    expect(window.localStorage.getItem(MASTER_PROFILE_STORAGE_KEY)).toBe("{ not json");
    expect(window.localStorage.getItem(CORRUPT_KEY)).toBe("{ not json");
  });

  it("salvages the valid sections of a partially invalid profile", () => {
    const profile = buildMasterProfile({
      experience: [
        {
          id: "experience-1",
          company: "NASA",
          role: "Lead Engineer",
          location: "Houston",
          startDate: "2020-01",
          endDate: "",
          current: true,
          summary: "Flight software.",
          highlights: [],
        },
      ],
    });

    storeMasterProfile({
      ...profile,
      // One malformed award must not cost the user their work history.
      awards: [{ id: "award-1", title: "Medal", awarder: "NASA", date: "not-a-date" }],
    } as unknown as MasterProfileData);

    const { profile: loaded } = loadMasterProfileFromLocalStorage();

    expect(loaded.experience).toHaveLength(1);
    expect(loaded.experience[0].company).toBe("NASA");
    expect(loaded.awards).toEqual([]);
  });

  it("salvages directly from a raw object", () => {
    const salvaged = salvageMasterProfile({
      summary: "Still here.",
      skills: [
        { id: "skill-1", name: "Systems", keywords: ["C"] },
        { id: "skill-2", name: 42, keywords: [] },
      ],
    });

    expect(salvaged.summary).toBe("Still here.");
    expect(salvaged.skills).toHaveLength(1);
    expect(salvaged.skills[0].name).toBe("Systems");
  });

  it("never throws while normalising, whatever shape it is handed", () => {
    const shapes: unknown[] = [
      null,
      undefined,
      {},
      { basics: null },
      { basics: { phone: 12345 } },
      { experience: "not an array" },
      { customization: { sectionSpacing: "wide" } },
      { sections: [{ id: "not-a-section" }] },
    ];

    for (const shape of shapes) {
      expect(() => saveMasterProfileToLocalStorage(shape as MasterProfileData)).not.toThrow();
      expect(() => loadMasterProfileFromLocalStorage()).not.toThrow();
    }
  });

  it("rejects a section spacing the server would reject", () => {
    const profile = buildMasterProfile({
      customization: { ...defaultResume.customization, sectionSpacing: 150 },
    });

    const validation = validateMasterProfileForSave(profile);

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain("Section Spacing must be between 0 and 120.");
  });
});
