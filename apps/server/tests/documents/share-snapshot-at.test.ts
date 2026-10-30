import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S-254: the studio warns that a link shows an older version by comparing the document's edit
 * time with the time the link's snapshot was taken. `updatedAt` moves on every view flush and
 * every rename, so the snapshot keeps its own time, set only when a snapshot is written.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    document: { findFirst: vi.fn(), updateMany: vi.fn() },
    shareLink: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("#lib/prisma", () => ({
  prisma: Object.assign(prismaMock, { $extends: () => prismaMock }),
}));

vi.mock("#lib/redis", () => ({
  getRedis: vi.fn(),
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => undefined),
  cacheDel: vi.fn(async () => undefined),
}));

vi.mock("#lib/cacheGeneration", () => ({ bumpGeneration: vi.fn(async () => undefined) }));

vi.mock("#services/userService", () => ({
  UserService: { requireUsernameForUser: vi.fn(async () => "jane") },
}));

vi.mock("#jobs/retentionJob", () => ({ PURGED_DOCUMENT_CONTENT: { purged: true } }));

import { ShareService } from "../../src/services/shareService.js";

describe("S-254 a share link keeps the time its snapshot was taken", () => {
  beforeEach(() => {
    prismaMock.document.findFirst
      .mockResolvedValueOnce({
        id: "doc-1",
        slug: "resume",
        visibility: "UNLISTED",
        type: "RESUME",
        moderatedPrivateAt: null,
      })
      .mockResolvedValueOnce(null);
    prismaMock.shareLink.update.mockImplementation(async ({ data }) => ({ id: "link-1", ...data }));
    prismaMock.shareLink.create.mockImplementation(async ({ data }) => ({ id: "link-1", ...data }));
  });

  it("S-254 refreshing the shared version stamps a new snapshotAt", async () => {
    prismaMock.shareLink.findUnique.mockResolvedValue({
      id: "link-1",
      slug: "resume",
      passwordHash: null,
      expiresAt: null,
    });

    const before = Date.now();
    await ShareService.createShareLink("user-1", "doc-1", { snapshot: {}, noExpiry: true });

    const { data } = prismaMock.shareLink.update.mock.calls[0]![0];
    expect(data.snapshotAt).toBeInstanceOf(Date);
    expect(data.snapshotAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
