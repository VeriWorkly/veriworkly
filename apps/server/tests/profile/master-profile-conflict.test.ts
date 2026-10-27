import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Master-profile optimistic concurrency (V-026).
 *
 * The old check was a read, a JavaScript compare and an unconditional upsert, so two saves
 * carrying the same `expectedUpdatedAt` both passed and the second silently overwrote the
 * first. Now the compare is in the UPDATE's own WHERE clause: whichever statement runs first
 * changes `updatedAt`, and the other matches nothing. These tests pin which statement runs
 * for each input and what a zero-row match turns into.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    masterProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateManyAndReturn: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// `#auth/index` wraps the client with `$extends` at import (V-265).
vi.mock("#lib/prisma", () => ({
  prisma: Object.assign(prismaMock, { $extends: () => prismaMock }),
}));

vi.mock("#lib/redis", () => ({
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => undefined),
  cacheDel: vi.fn(async () => undefined),
}));

import { ProfileService } from "../../src/services/profileService.js";
import { buildResumeShell } from "../../src/services/profileImportService.js";

const CURSOR = "2026-04-10T10:00:00.000Z";
const LATER = new Date("2026-04-10T10:00:05.000Z");

function profile() {
  return buildResumeShell({
    basics: {
      fullName: "Test User",
      role: "Engineer",
      headline: "",
      email: "",
      phone: "",
      location: "",
      linkEmail: false,
      linkPhone: false,
      linkLocation: false,
    },
    links: [],
    summary: "",
    projects: [],
    skills: [],
  });
}

beforeEach(() => {
  prismaMock.masterProfile.findUnique.mockReset();
  prismaMock.masterProfile.create.mockReset();
  prismaMock.masterProfile.updateManyAndReturn.mockReset();
  prismaMock.masterProfile.upsert.mockReset();
});

describe("ProfileService.updateMasterProfile concurrency contract", () => {
  it("writes with the cursor in the WHERE clause and returns the matched row", async () => {
    const row = { id: "p1", userId: "user-1", updatedAt: LATER };
    prismaMock.masterProfile.updateManyAndReturn.mockResolvedValue([row]);

    const result = await ProfileService.updateMasterProfile("user-1", profile(), CURSOR);

    expect(result).toBe(row);
    expect(prismaMock.masterProfile.updateManyAndReturn).toHaveBeenCalledTimes(1);
    const [args] = prismaMock.masterProfile.updateManyAndReturn.mock.calls[0] as [
      { where: { userId: string; updatedAt: Date } },
    ];
    expect(args.where).toEqual({ userId: "user-1", updatedAt: new Date(CURSOR) });
    expect(prismaMock.masterProfile.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.masterProfile.create).not.toHaveBeenCalled();
  });

  it("a stale cursor against an existing row is 409 with the current updatedAt", async () => {
    prismaMock.masterProfile.updateManyAndReturn.mockResolvedValue([]);
    prismaMock.masterProfile.findUnique.mockResolvedValue({ updatedAt: LATER });

    await expect(
      ProfileService.updateMasterProfile("user-1", profile(), CURSOR),
    ).rejects.toMatchObject({
      statusCode: 409,
      details: { currentUpdatedAt: LATER },
    });

    expect(prismaMock.masterProfile.create).not.toHaveBeenCalled();
  });

  it("no cursor against an existing row is 409, never a blind overwrite", async () => {
    prismaMock.masterProfile.findUnique.mockResolvedValue({ updatedAt: LATER });

    await expect(ProfileService.updateMasterProfile("user-1", profile())).rejects.toMatchObject({
      statusCode: 409,
      details: { currentUpdatedAt: LATER },
    });

    expect(prismaMock.masterProfile.updateManyAndReturn).not.toHaveBeenCalled();
    expect(prismaMock.masterProfile.create).not.toHaveBeenCalled();
    expect(prismaMock.masterProfile.upsert).not.toHaveBeenCalled();
  });

  it("no cursor and no row creates the row (the first save)", async () => {
    const created = { id: "p1", userId: "user-1", updatedAt: LATER };
    prismaMock.masterProfile.findUnique.mockResolvedValue(null);
    prismaMock.masterProfile.create.mockResolvedValue(created);

    const result = await ProfileService.updateMasterProfile("user-1", profile());

    expect(result).toBe(created);
    expect(prismaMock.masterProfile.create).toHaveBeenCalledTimes(1);
  });

  it("a cursor with no row to match still creates when no row exists", async () => {
    const created = { id: "p1", userId: "user-1", updatedAt: LATER };
    prismaMock.masterProfile.updateManyAndReturn.mockResolvedValue([]);
    prismaMock.masterProfile.findUnique.mockResolvedValue(null);
    prismaMock.masterProfile.create.mockResolvedValue(created);

    const result = await ProfileService.updateMasterProfile("user-1", profile(), CURSOR);

    expect(result).toBe(created);
  });

  it("two first saves at once: the loser's unique violation becomes a 409", async () => {
    prismaMock.masterProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ updatedAt: LATER });
    prismaMock.masterProfile.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(ProfileService.updateMasterProfile("user-1", profile())).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("replaceMasterProfile (imports) upserts on the given client without a cursor", async () => {
    const tx = { masterProfile: { upsert: vi.fn(async () => ({ id: "p1" })) } };

    await ProfileService.replaceMasterProfile("user-1", profile(), tx as never);

    expect(tx.masterProfile.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.masterProfile.upsert).not.toHaveBeenCalled();
  });
});
