import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stored RESUME bodies predate the typed section model: their certificates, languages,
 * references and five more sections live inside `customSections`, flattened into one shared
 * item shape. `DocumentService` migrates them on read rather than in a backfill, so a
 * document nobody opens costs nothing and a mapping mistake is recoverable — the stored row
 * is untouched until the user saves.
 *
 * These tests pin the two properties that matter: a legacy body comes back typed, and a body
 * that has already migrated is returned unchanged.
 */

const { prismaMock, cacheGetMock, cacheSetMock } = vi.hoisted(() => ({
  prismaMock: {
    document: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  cacheGetMock: vi.fn(async () => null),
  cacheSetMock: vi.fn(async () => undefined),
}));

vi.mock("#lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("#lib/redis", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
  cacheDel: vi.fn(async () => undefined),
  cacheDelByPrefix: vi.fn(async () => undefined),
}));

vi.mock("#services/entitlementService", () => ({
  EntitlementService: { has: vi.fn(async () => true) },
}));

vi.mock("#utils/slugs", () => ({
  buildUniqueSlugHelper: vi.fn(async () => "some-slug"),
}));

import { DocumentService } from "../../src/services/documentService";

function legacyResumeDocument() {
  return {
    id: "doc-1",
    type: "RESUME" as const,
    userId: "user-1",
    content: {
      id: "doc-1",
      basics: { fullName: "Ada Lovelace" },
      customSections: [
        {
          id: "references-default",
          kind: "references",
          title: "References",
          items: [
            {
              id: "ref-1",
              name: "Grace Hopper",
              issuer: "US Navy",
              date: "",
              link: "mailto:grace@example.com",
              referenceId: "",
              description: "Rear Admiral / Former manager",
              details: ["+15550102026"],
            },
          ],
        },
        { id: "custom-a", kind: "custom", title: "Speaking", items: [] },
      ],
    },
  };
}

describe("stored resume documents migrate to the typed section model on read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheGetMock.mockResolvedValue(null);
  });

  it("returns typed sections from getDocument for a legacy body", async () => {
    prismaMock.document.findFirst.mockResolvedValue(legacyResumeDocument());

    const document = (await DocumentService.getDocument("user-1", "doc-1")) as {
      content: Record<string, unknown>;
    };

    const content = document.content as {
      references: Array<Record<string, unknown>>;
      customSections: Array<Record<string, unknown>>;
    };

    expect(content.references).toEqual([
      {
        id: "ref-1",
        name: "Grace Hopper",
        title: "Rear Admiral",
        organization: "US Navy",
        relationship: "Former manager",
        email: "grace@example.com",
        phone: "+15550102026",
      },
    ]);

    // The mirrored section is gone; the genuinely custom one stays.
    expect(content.customSections).toHaveLength(1);
    expect(content.customSections[0].kind).toBe("custom");
  });

  it("caches the migrated shape, so a cache hit and a miss agree", async () => {
    prismaMock.document.findFirst.mockResolvedValue(legacyResumeDocument());

    await DocumentService.getDocument("user-1", "doc-1");

    const [, cached] = cacheSetMock.mock.calls[0] as [
      string,
      { content: { references: unknown[] } },
    ];

    expect(cached.content.references).toHaveLength(1);
  });

  it("leaves an already-migrated body untouched", async () => {
    const typedContent = {
      id: "doc-2",
      references: [
        {
          id: "ref-9",
          name: "Katherine Johnson",
          title: "Mathematician",
          organization: "NASA",
          relationship: "Colleague",
          email: "kj@example.com",
          phone: "+15550100000",
        },
      ],
      customSections: [{ id: "custom-a", kind: "custom", title: "Speaking", items: [] }],
    };

    prismaMock.document.findFirst.mockResolvedValue({
      id: "doc-2",
      type: "RESUME",
      userId: "user-1",
      content: typedContent,
    });

    const document = (await DocumentService.getDocument("user-1", "doc-2")) as {
      content: unknown;
    };

    expect(document.content).toBe(typedContent);
  });

  it("does not touch a cover letter body", async () => {
    const letterContent = { senderName: "Ada Lovelace", customSections: [] };

    prismaMock.document.findFirst.mockResolvedValue({
      id: "doc-3",
      type: "COVER_LETTER",
      userId: "user-1",
      content: letterContent,
    });

    const document = (await DocumentService.getDocument("user-1", "doc-3")) as {
      content: unknown;
    };

    expect(document.content).toBe(letterContent);
  });

  it("migrates list results only when content was requested", async () => {
    prismaMock.document.findMany.mockResolvedValue([legacyResumeDocument()]);

    const [withContent] = (await DocumentService.listDocuments("user-1", undefined, {
      includeContent: true,
    })) as Array<{ content: { references: unknown[] } }>;

    expect(withContent.content.references).toHaveLength(1);
  });
});
