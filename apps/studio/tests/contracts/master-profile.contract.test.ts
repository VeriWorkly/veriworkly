import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { MasterProfileData, ResumeData } from "@/types/resume";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { getContactItems } from "@/features/documents/rendering/resume-rendering";
import {
  rebaseAfterSave,
  emptyAward,
  isInAppNavigation,
  prepareMasterProfileForSave,
  validateMasterProfileForSave,
} from "@/features/profile/components/master/master-utils";
import ProfileMaster from "@/features/profile/components/master/ProfileMaster";
import { BasicsAndSummarySections } from "@/features/profile/components/master/BasicsAndSummarySections";
import {
  checkMasterProfileJson,
  prepareMasterProfileJsonForSave,
} from "@/features/profile/components/advanced/advanced-profile-utils";
import {
  isValidPhoneValue,
  normalizePhoneValue,
} from "@/features/resume/schemas/resume-validation-rules";
import {
  getMasterProfile,
  salvageMasterProfile,
  deriveResumeFromMasterProfile,
  resolveConflictUpdatedAt,
  loadMasterProfileForEditor,
  loadMasterProfileFromDatabase,
  saveMasterProfileToDatabase,
  getMasterProfileForNewDocument,
  loadMasterProfileFromLocalStorage,
  saveMasterProfileToLocalStorage,
} from "@/features/resume/services/master-profile";
import { ApiRequestError } from "@/utils/fetchApiData";
import { useUserStore } from "@/store/useUserStore";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

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

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

vi.mock("@/utils/fetchApiData", () => ({
  fetchApiData: fetchApiDataMock,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    details: unknown;

    constructor(message: string, status: number, details?: unknown) {
      super(message);
      this.status = status;
      this.details = details;
    }
  },
}));

/**
 * Mirror of the service's private `getDefaultProfile()` — the master-profile-shaped subset
 * of `defaultResume`. Duplicated rather than exported so a change to the service's notion
 * of "default" is a test failure instead of a silently agreeing tautology.
 */
function buildMasterProfile(overrides: Partial<MasterProfileData> = {}): MasterProfileData {
  const base = structuredClone(defaultResume) as ResumeData;
  // The date format and paper size are a document's choice; a profile's customization has no
  // such keys.
  delete base.customization.dateFormat;
  delete base.customization.paperSize;

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

/** The stored profile, failing the test when the device has none to read. */
function loadStoredProfile(): MasterProfileData {
  const result = loadMasterProfileFromLocalStorage();

  if (result.status !== "ok") throw new Error(`expected a stored profile, got "${result.status}"`);

  return result.profile;
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

  it("S-115: reports an empty device instead of inventing a sample profile", () => {
    expect(loadMasterProfileFromLocalStorage()).toEqual({ status: "empty" });
  });

  it("S-115: a list the user emptied stays empty after a reload", () => {
    saveMasterProfileToLocalStorage(
      buildMasterProfile({ experience: [], education: [], projects: [], skills: [] }),
    );

    const profile = loadStoredProfile();

    expect(profile.experience).toEqual([]);
    expect(profile.education).toEqual([]);
    expect(profile.projects).toEqual([]);
    expect(profile.skills).toEqual([]);
  });

  it("keeps a stored profile whose phone is empty", () => {
    storeMasterProfile(
      buildMasterProfile({
        basics: { ...defaultResume.basics, fullName: "Ada Lovelace", phone: "" },
      }),
    );

    const profile = loadStoredProfile();

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

    const profile = loadStoredProfile();

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

    const loaded = loadStoredProfile();

    expect(withoutUpdatedAt(loaded)).toEqual(withoutUpdatedAt(profile));
  });

  it("keeps an international phone number intact across save, load, and derive", () => {
    const profile = buildMasterProfile({
      basics: { ...defaultResume.basics, phone: "+44 20 7946 0958" },
    });

    saveMasterProfileToLocalStorage(profile);

    const loaded = loadStoredProfile();
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

    const resume = deriveResumeFromMasterProfile("resume-derived", loadStoredProfile());

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

    const resume = deriveResumeFromMasterProfile("resume-custom", loadStoredProfile());

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

    const resume = deriveResumeFromMasterProfile("resume-typed", loadStoredProfile());

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
    expect(loadStoredProfile().basics.fullName).toBe("Barbara Liskov");
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

    expect(loadMasterProfileFromLocalStorage()).toEqual({ status: "corrupt" });
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

    const loaded = loadStoredProfile();

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

describe("master profile for a new account and a failed load (S-115, S-158, S-184, S-080)", () => {
  beforeEach(() => {
    const localStorageMock = createLocalStorageMock();

    fetchApiDataMock.mockReset();

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", { localStorage: localStorageMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useUserStore.getState().logout();
  });

  it("S-184: asks for the profile with 404 meaning empty", async () => {
    fetchApiDataMock.mockResolvedValue(null);

    expect(await loadMasterProfileFromDatabase()).toEqual({ status: "empty" });
    expect(fetchApiDataMock).toHaveBeenCalledWith(
      "/profiles/master",
      expect.objectContaining({ nullOnNotFound: true }),
    );
  });

  it("S-158: treats the old blank record (empty content, empty id) as empty, not unparseable", async () => {
    fetchApiDataMock.mockResolvedValue({
      profile: { id: "", userId: "user-1", content: {}, createdAt: "", updatedAt: "" },
      summary: null,
    });

    expect((await loadMasterProfileFromDatabase()).status).toBe("empty");
  });

  it("S-115 S-211: a fresh account opens an empty master editor", async () => {
    fetchApiDataMock.mockResolvedValue(null);

    const state = await loadMasterProfileForEditor();

    expect(state.status).toBe("ready");
    if (state.status !== "ready") return;

    expect(state.source).toBe("new");
    expect(state.updatedAt).toBeNull();
    expect(state.profile.basics.fullName).toBe("");
    expect(state.profile.experience).toEqual([]);
    expect(JSON.stringify(state.profile)).not.toMatch(/veriworkly|gautam/i);
  });

  it("S-080: a failed load is an error, never the local cache with no cursor", async () => {
    storeMasterProfile(buildMasterProfile());
    fetchApiDataMock.mockRejectedValue(new Error("Service unavailable"));

    const state = await loadMasterProfileForEditor();

    expect(state.status).toBe("error");
  });

  it("S-080: an unreadable row keeps its cursor so a save over it is not blind", async () => {
    fetchApiDataMock.mockResolvedValue({
      profile: {
        id: "profile-1",
        userId: "user-1",
        content: { summary: 42 },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      summary: null,
    });

    const state = await loadMasterProfileForEditor();

    expect(state.status === "ready" && state.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    // Said out loud, so the user knows a save replaces what could not be read.
    expect(state.status === "ready" && state.recovered).toBe(true);
  });

  it("S-184: a save on an existing profile sends its cursor", async () => {
    fetchApiDataMock.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      content: buildMasterProfile(),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });

    await saveMasterProfileToDatabase(buildMasterProfile(), "2026-01-02T00:00:00.000Z");

    const body = JSON.parse(fetchApiDataMock.mock.calls[0][1].body as string);

    expect(body.expectedUpdatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("S-242: a 409 yields the server's current cursor for 'save my version'", async () => {
    const conflict = new ApiRequestError("Master profile already exists.", 409, {
      currentUpdatedAt: "2026-01-05T00:00:00.000Z",
    });

    expect(await resolveConflictUpdatedAt(conflict)).toBe("2026-01-05T00:00:00.000Z");
    expect(await resolveConflictUpdatedAt(new ApiRequestError("Nope", 500))).toBeNull();
  });

  it("S-012: a guest creating a document never asks the server for a profile", async () => {
    fetchApiDataMock.mockRejectedValue(new ApiRequestError("Unauthorized", 401));

    expect(await getMasterProfileForNewDocument()).toBeUndefined();
    expect(fetchApiDataMock).not.toHaveBeenCalled();
  });

  it("S-012: a signed-in user's new document is seeded from the database profile", async () => {
    useUserStore.getState().setUser({ email: "ada@example.com" } as never);
    fetchApiDataMock.mockResolvedValue({
      profile: {
        id: "profile-1",
        userId: "user-1",
        content: buildMasterProfile({
          basics: { ...defaultResume.basics, fullName: "Ada Lovelace" },
        }),
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      summary: null,
    });

    expect((await getMasterProfileForNewDocument())?.basics.fullName).toBe("Ada Lovelace");
  });
});

describe("Master Profile editors (Phase 9 Part D)", () => {
  it("S-281: the link options say what they do, and how to keep a detail off documents", () => {
    const html = renderToStaticMarkup(
      createElement(BasicsAndSummarySections, {
        localProfile: buildMasterProfile(),
        updateProfile: () => undefined,
        setBasicField: () => undefined,
        updateLink: () => undefined,
        updateLinkDisplayMode: () => undefined,
      }),
    );

    expect(html).not.toMatch(/Show (email|phone|location)/);
    expect(html).toContain("Phone opens call");
    expect(html).toContain("leave it empty here");
  });

  it("S-327: hand-typed month dates are read into YYYY-MM instead of refusing the save", () => {
    const profile = buildMasterProfile({
      basics: { ...defaultResume.basics, email: "ada@example.com" },
      experience: [
        {
          ...defaultResume.experience[0],
          startDate: "Mar 2022",
          endDate: "Present",
          current: false,
        },
      ],
    });

    const prepared = prepareMasterProfileForSave(profile);

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.profile.experience[0]).toMatchObject({
      startDate: "2022-03",
      endDate: "",
      current: true,
    });
  });

  it("S-327: what was typed while a save ran survives the save's reply", () => {
    const submitted = buildMasterProfile();
    const typedSince = { ...submitted, summary: "typed during the save" };
    const saved = buildMasterProfile({ summary: "from the server" });

    expect(rebaseAfterSave(typedSince, submitted, saved)).toBe(typedSince);
    expect(rebaseAfterSave(submitted, submitted, saved)).toBe(saved);
    expect(rebaseAfterSave(typedSince, null, saved)).toBe(saved);
  });

  it("S-327: refused fields are listed where they can be read, and a first visit is not 'Synced'", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileMaster, {
        profile: buildMasterProfile(),
        onSave: async () => undefined,
        neverSaved: true,
      }),
    );

    expect(html).toContain("Not saved yet");
    expect(html).not.toMatch(/Everything Synced/i);
  });

  it("S-332: the JSON editor refuses a profile the guided editor would refuse", () => {
    const profile = buildMasterProfile({
      basics: { ...defaultResume.basics, email: "" },
    });

    expect(() => prepareMasterProfileJsonForSave(JSON.stringify(profile))).toThrow(
      /email must be a valid email/i,
    );
  });

  it("O7 LOW: the JSON editor tells a syntax error from a profile that does not fit", () => {
    expect(checkMasterProfileJson("{")).toMatchObject({ ok: false, kind: "syntax" });
    expect(checkMasterProfileJson('{"basics": 1}')).toMatchObject({ ok: false, kind: "schema" });
  });
});

describe("Master Profile form accessibility and editing (O7 LOW)", () => {
  it("every multi-line field has a name, and custom items can be removed", async () => {
    const { CoreSections } = await import("@/features/profile/components/master/CoreSections");
    const { AdditionalSections } =
      await import("@/features/profile/components/master/AdditionalSections");
    const noop = () => undefined;
    const profile = buildMasterProfile({
      customSections: [
        {
          id: "talks",
          kind: "custom",
          title: "Talks",
          editableTitle: true,
          items: [
            {
              id: "t1",
              name: "Keynote",
              issuer: "",
              date: "",
              link: "",
              referenceId: "",
              description: "",
              details: [],
            },
          ],
        },
      ],
    });
    const props = {
      localProfile: profile,
      updateRepeatableItem: noop,
      addRepeatableItem: noop,
      removeRepeatableItem: noop,
    };

    const html =
      renderToStaticMarkup(createElement(CoreSections, props)) +
      renderToStaticMarkup(createElement(AdditionalSections, props));

    expect(html).not.toMatch(/<textarea(?![^>]*aria-label=)[^>]*>/);
    expect(html).not.toContain('<label class="text-sm font-medium">');
    expect(html).toContain('aria-label="Remove Keynote"');
  });
});

describe("Master Profile review fixes (Phase 9 Part D)", () => {
  it("S-332 a legacy section in pasted JSON survives a JSON-editor save", () => {
    const profile = {
      ...buildMasterProfile({ basics: { ...defaultResume.basics, email: "ada@example.com" } }),
      awards: [],
      customSections: [
        {
          id: "legacy-awards",
          kind: "awards",
          title: "Awards",
          items: [
            {
              id: "a1",
              name: "Turing Prize",
              issuer: "ACM",
              date: "2022-03",
              link: "",
              referenceId: "",
              description: "",
              details: [],
            },
          ],
        },
      ],
    };

    const saved = prepareMasterProfileJsonForSave(JSON.stringify(profile));

    expect(saved.awards.map((award) => award.title)).toEqual(["Turing Prize"]);
  });

  it("the JSON editor imports the Master Profile from an account backup file", () => {
    const backup = {
      format: "veriworkly-backup",
      version: 1,
      exportedAt: "2026-10-27T00:00:00.000Z",
      documents: [],
      masterProfile: buildMasterProfile({
        basics: { ...defaultResume.basics, fullName: "Ada Lovelace" },
      }),
    };

    const checked = checkMasterProfileJson(JSON.stringify(backup));

    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.profile.basics.fullName).toBe("Ada Lovelace");
  });

  it("S-327 'Save my version' after a conflict saves what was typed after the toast, not before", async () => {
    const { toast } = await import("sonner");
    const toastError = vi.spyOn(toast, "error").mockImplementation(() => "id");
    const { reportMasterSaveFailure } =
      await import("@/features/profile/components/master/master-save-failure");
    const { ApiRequestError } = await import("@/utils/fetchApiData");

    // The editor as the retry finds it: whatever was typed last.
    let draft = "before the conflict";
    const saved: Array<{ summary: string; cursor?: string }> = [];
    const saveLatest = async (cursor?: string) => {
      saved.push({ summary: draft, cursor });
    };

    await reportMasterSaveFailure(
      new (ApiRequestError as unknown as new (m: string, s: number, d: unknown) => Error)(
        "Your profile changed on another device.",
        409,
        { currentUpdatedAt: "2026-10-27T10:00:00.000Z" },
      ),
      saveLatest,
    );

    draft = "typed after the toast appeared";
    const options = toastError.mock.calls[0][1] as unknown as { action: { onClick: () => void } };
    options.action.onClick();
    await Promise.resolve();

    expect(saved).toEqual([
      { summary: "typed after the toast appeared", cursor: "2026-10-27T10:00:00.000Z" },
    ]);
  });
});

describe("Master Profile second-review fixes (Phase 9 Part D)", () => {
  async function loadRetry() {
    return import("@/features/profile/components/master/master-save-failure");
  }

  function editor(overrides: Partial<{ dirty: boolean; saving: boolean }> = {}) {
    const calls = {
      saved: [] as Array<string | undefined>,
      queued: [] as Array<string | undefined>,
    };
    return {
      calls,
      editor: {
        isDirty: () => overrides.dirty ?? true,
        isSaving: () => overrides.saving ?? false,
        queue: (cursor?: string) => void calls.queued.push(cursor),
        save: async (cursor?: string) => void calls.saved.push(cursor),
      },
    };
  }

  it("S-327 'Save my version' after Reset does nothing, so newer stored data is not overwritten", async () => {
    const { retryLatestSave } = await loadRetry();
    const { calls, editor: clean } = editor({ dirty: false });

    await retryLatestSave(clean, "cursor");

    expect(calls.saved).toEqual([]);
  });

  it("S-327 a retry clicked while a save runs waits for it instead of being dropped", async () => {
    const { retryLatestSave } = await loadRetry();
    const { calls, editor: busy } = editor({ saving: true });

    await retryLatestSave(busy, "cursor");

    expect(calls.saved).toEqual([]);
    expect(calls.queued).toEqual(["cursor"]);
  });

  it("S-327 a toast that outlives the editor does nothing", async () => {
    const { saveThroughRef } = await loadRetry();
    const ref = { current: null };

    await expect(saveThroughRef(ref)("cursor")).resolves.toBeUndefined();
  });

  it("S-327 the conflict toast has one id, so Reset and a later save can withdraw it", async () => {
    const { toast } = await import("sonner");
    const toastError = vi.spyOn(toast, "error").mockImplementation(() => "id");
    const dismiss = vi.spyOn(toast, "dismiss").mockImplementation(() => "id");
    const { reportMasterSaveFailure, dismissMasterSaveFailure } = await loadRetry();
    const { ApiRequestError } = await import("@/utils/fetchApiData");

    await reportMasterSaveFailure(
      new (ApiRequestError as unknown as new (m: string, s: number, d: unknown) => Error)(
        "Changed elsewhere.",
        409,
        { currentUpdatedAt: "2026-10-27T10:00:00.000Z" },
      ),
      async () => undefined,
    );
    dismissMasterSaveFailure();

    const options = toastError.mock.calls[0][1] as unknown as { id: string };
    expect(dismiss).toHaveBeenCalledWith(options.id);
  });

  it("S-327 'Present' is read only as an end date; elsewhere it is refused, not blanked", () => {
    const base = buildMasterProfile({
      basics: { ...defaultResume.basics, email: "ada@example.com" },
    });
    const job = { ...defaultResume.experience[0], current: false };

    const startPresent = prepareMasterProfileForSave({
      ...base,
      experience: [{ ...job, startDate: "Present", endDate: "2024-01" }],
    });
    const awardNow = prepareMasterProfileForSave({
      ...base,
      awards: [{ ...emptyAward(), title: "Prize", date: "now" }],
    });

    expect(startPresent.ok).toBe(false);
    if (!startPresent.ok) expect(startPresent.issues.join(" ")).toMatch(/YYYY-MM/);
    expect(awardNow.ok).toBe(false);
    if (!awardNow.ok) expect(awardNow.issues.join(" ")).toMatch(/YYYY-MM/);
  });

  it("S-327 a link to another studio page asks first; new tabs, other sites and skip links do not", () => {
    const here = { origin: "https://app.example", pathname: "/profile/master", search: "" };
    const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
    const link = (href: string, target = "") => ({ href, target, hasAttribute: () => false });

    expect(isInAppNavigation(click, link("https://app.example/documents"), here)).toBe(true);
    expect(isInAppNavigation(click, link("https://app.example/profile/master#basics"), here)).toBe(
      false,
    );
    expect(isInAppNavigation(click, link("https://docs.example/"), here)).toBe(false);
    expect(isInAppNavigation(click, link("https://app.example/documents", "_blank"), here)).toBe(
      false,
    );
    expect(
      isInAppNavigation({ ...click, metaKey: true }, link("https://app.example/documents"), here),
    ).toBe(false);
  });

  it("a backup with no Master Profile says so", () => {
    const checked = checkMasterProfileJson(
      JSON.stringify({
        format: "veriworkly-backup",
        version: 1,
        documents: [],
        masterProfile: null,
      }),
    );

    expect(checked).toEqual({
      ok: false,
      kind: "schema",
      message: "This backup has no Master Profile.",
    });
  });
});
