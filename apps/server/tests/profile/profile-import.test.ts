import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The import pipeline is the one writer that reaches the master profile without going
 * through the HTTP controller, so nothing it produced was ever validated. It emitted a
 * `sync` object the profile schema has no field for and an `undefined` phone where the
 * schema wants a string, which meant an import "succeeded", wrote a row, and then failed to
 * parse on every subsequent read — the user saw an import that had apparently done nothing.
 *
 * These tests pin the two properties that stop that recurring: what the mappers emit is
 * valid profile content, and the service refuses to persist content that is not.
 */

const { prismaMock, entitlementHas } = vi.hoisted(() => ({
  prismaMock: {
    masterProfile: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({ id: "profile-1", updatedAt: new Date() })),
    },
    document: {
      count: vi.fn(async () => 0),
      create: vi.fn(async () => ({ id: "doc-1" })),
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
    },
    user: { findUnique: vi.fn(async () => ({ username: "tester" })) },
  },
  entitlementHas: vi.fn(async () => true),
}));

vi.mock("#lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("#lib/redis", () => ({
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => undefined),
  cacheDel: vi.fn(async () => undefined),
  cacheDelByPrefix: vi.fn(async () => undefined),
}));

vi.mock("#services/entitlementService", () => ({
  EntitlementService: { has: entitlementHas },
}));

vi.mock("#utils/slugs", () => ({
  buildUniqueSlugHelper: vi.fn(async () => "some-slug"),
}));

import { sanitizeImportedPhone } from "@veriworkly/profile-core";

import { ProfileService } from "../../src/services/profileService";
import { DocumentService } from "../../src/services/documentService";
import { masterProfileContentSchema } from "../../src/validators/masterProfileValidator";
import { buildResumeShell, mapGithubToResumeData } from "../../src/services/profileImportService";

function githubProfile(overrides: Record<string, unknown> = {}) {
  return {
    login: "octocat",
    name: "Mona Lisa Octocat",
    bio: "Builds things.",
    html_url: "https://github.com/octocat",
    ...overrides,
  };
}

describe("profile import mappers", () => {
  it("emits content that passes the master profile schema", () => {
    const shell = buildResumeShell({
      basics: {
        fullName: "Mona Lisa Octocat",
        role: "Software Developer",
        headline: "Builds things.",
        email: "mona@example.com",
        phone: "",
        location: "San Francisco",
        linkEmail: true,
        linkPhone: false,
        linkLocation: true,
      },
      links: [],
      summary: "Builds things.",
      projects: [],
      skills: [],
    });

    const result = masterProfileContentSchema.safeParse(shell);

    expect(result.success).toBe(true);
  });

  it("emits no sync key", () => {
    const shell = buildResumeShell({
      basics: {},
      links: [],
      summary: "",
      projects: [],
      skills: [],
    });

    expect("sync" in shell).toBe(false);
  });

  it("produces valid content from a GitHub profile with no email and no location", () => {
    const content = mapGithubToResumeData(githubProfile({ email: null, location: null }), []);

    expect(content.basics.phone).toBe("");
    expect(content.basics.linkPhone).toBe(false);
    expect(content.basics.email).toBe("");
    expect(content.basics.linkEmail).toBe(false);
    expect(content.basics.location).toBe("");
    expect(content.basics.linkLocation).toBe(false);

    expect(masterProfileContentSchema.safeParse(content).success).toBe(true);
  });

  it("never returns undefined from the imported-phone sanitiser", () => {
    expect(sanitizeImportedPhone(undefined)).toBe("");
    expect(sanitizeImportedPhone(null)).toBe("");
    expect(sanitizeImportedPhone("not a phone")).toBe("");
    expect(sanitizeImportedPhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(sanitizeImportedPhone("9876543210")).toBe("9876543210");
    expect(sanitizeImportedPhone("(987) 654-3210")).toBe("9876543210");
  });
});

describe("ProfileService.updateMasterProfile validation", () => {
  const validProfile = () =>
    mapGithubToResumeData(githubProfile({ email: "mona@example.com", location: "SF" }), []);

  beforeEach(() => {
    prismaMock.masterProfile.upsert.mockClear();
    prismaMock.masterProfile.findUnique.mockClear();
  });

  it("refuses invalid content with a 422 and never reaches the database", async () => {
    const invalid = validProfile();
    invalid.basics.phone = "123";

    await expect(ProfileService.updateMasterProfile("user-1", invalid)).rejects.toMatchObject({
      statusCode: 422,
    });

    expect(prismaMock.masterProfile.upsert).not.toHaveBeenCalled();
  });

  /*
   * `sync` is stripped rather than rejected: Phase 2 moved both schemas to `.strip()` so a
   * client deployed ahead of the server degrades to "the new field is ignored" instead of a
   * hard 400 on every save. What matters here is that it does not reach the stored content.
   */
  it("strips a stray sync key instead of persisting it", async () => {
    const withSync = { ...validProfile(), sync: { enabled: false, status: "local-only" } };

    await ProfileService.updateMasterProfile("user-1", withSync);

    expect(prismaMock.masterProfile.upsert).toHaveBeenCalledTimes(1);

    const persisted = prismaMock.masterProfile.upsert.mock.calls[0][0] as {
      create: { content: Record<string, unknown> };
    };

    expect("sync" in persisted.create.content).toBe(false);
  });
});

/**
 * Seeding goes through the projections now, which is what makes a document created over the
 * API the same shape as one created in the editor.
 *
 * The cover letter used to be seeded with the raw resume-shaped profile content. It reads
 * senderName / greeting / body, none of which exist in that shape, so every field parsed to
 * "" and the user got a blank page — worse than the sample letter. Seeding it was then
 * switched off entirely; `projectToCoverLetter` is what allows it back on.
 */
describe("DocumentService seeding from the master profile", () => {
  const storedProfile = () => ({
    content: {
      ...mapGithubToResumeData(githubProfile({ email: "mona@example.com", location: "SF" }), []),
      basics: {
        fullName: "Mona Lisa Octocat",
        role: "Engineer",
        headline: "",
        email: "mona@example.com",
        phone: "+442079460958",
        location: "SF",
        linkEmail: true,
        linkPhone: true,
        linkLocation: true,
      },
    },
  });

  function createdContent() {
    const call = prismaMock.document.create.mock.calls[0][0] as {
      data: { id?: string; templateId: string; content: Record<string, unknown> };
    };

    return call.data;
  }

  beforeEach(() => {
    prismaMock.masterProfile.findUnique.mockClear();
    prismaMock.document.create.mockClear();
    prismaMock.masterProfile.findUnique.mockResolvedValue(storedProfile());
  });

  it("seeds a resume through projectToResume, with the document's own id", async () => {
    await DocumentService.createDocument("user-1", { type: "RESUME", id: "doc-resume-1" });

    expect(prismaMock.masterProfile.findUnique).toHaveBeenCalledTimes(1);

    const { content } = createdContent();

    expect((content.basics as { fullName: string }).fullName).toBe("Mona Lisa Octocat");
    expect(content.id).toBe("doc-resume-1");
    expect(content.sync).toEqual({
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    });
  });

  it("gives a seeded resume an id even when the caller supplied none", async () => {
    await DocumentService.createDocument("user-1", { type: "RESUME" });

    const { id, content } = createdContent();

    expect(id).toBeTruthy();
    expect(content.id).toBe(id);
  });

  /*
   * Generating an id up front is only defensible because a seeded body has to carry one. Any
   * other create must still fall through to prisma's own `@default(cuid())`, or this would be
   * quietly changing the id format of every document the server creates.
   */
  it("leaves id generation to prisma when it is not seeding", async () => {
    await DocumentService.createDocument("user-1", {
      type: "RESUME",
      content: { basics: { fullName: "Supplied by the caller" } },
    });

    expect(prismaMock.masterProfile.findUnique).not.toHaveBeenCalled();
    expect(createdContent().id).toBeUndefined();
  });

  it("leaves id generation to prisma when the user has no profile to seed from", async () => {
    prismaMock.masterProfile.findUnique.mockResolvedValue(null);

    await DocumentService.createDocument("user-1", { type: "RESUME" });

    expect(createdContent().id).toBeUndefined();
  });

  /*
   * The client reads the row's `templateId` in preference to the body's, so leaving the
   * column at its "modern" default would silently override the template the profile chose.
   */
  it("keeps the row's template in step with the seeded body's", async () => {
    await DocumentService.createDocument("user-1", { type: "RESUME" });

    const { templateId, content } = createdContent();

    expect(templateId).toBe(content.templateId);
    expect(templateId).not.toBe("modern");
  });

  it("seeds a cover letter with the sender block and an empty letter", async () => {
    await DocumentService.createDocument("user-1", { type: "COVER_LETTER" });

    expect(prismaMock.masterProfile.findUnique).toHaveBeenCalledTimes(1);

    const { content } = createdContent();

    expect(content.senderName).toBe("Mona Lisa Octocat");
    expect(content.senderEmail).toBe("mona@example.com");
    expect(content.senderPhone).toBe("+442079460958");
    // Per-application prose is never invented on the user's behalf.
    expect(content.body).toBe("");
    expect(content.greeting).toBe("");
  });

  it("leaves content empty when the user has no master profile", async () => {
    prismaMock.masterProfile.findUnique.mockResolvedValue(null);

    await DocumentService.createDocument("user-1", { type: "COVER_LETTER" });

    expect(createdContent().content).toEqual({});
  });
});
