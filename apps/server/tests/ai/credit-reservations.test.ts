import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  creditReservation: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  creditWallet: {
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  creditGrant: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    updateMany: vi.fn(),
  },
  creditTransaction: {
    create: vi.fn(),
  },
  creditUsageAllocation: {
    createMany: vi.fn(),
  },
  // `SELECT ... FOR UPDATE` on the wallet row, then on the grant rows.
  $queryRaw: vi.fn(),
};

const prisma = {
  creditReservation: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  creditGrant: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(tx)),
};

vi.mock("#lib/prisma", () => ({ prisma, default: prisma }));
vi.mock("#lib/redis", () => ({
  cacheDel: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));
vi.mock("#services/aiPolicy", () => ({
  getAiModePolicy: vi.fn(() => ({ credits: 7 })),
}));

describe("AI credit reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.creditReservation.count.mockResolvedValue(0);
    prisma.creditReservation.findMany.mockResolvedValue([]);
    prisma.creditGrant.findMany.mockResolvedValue([]);
    tx.creditReservation.findUnique.mockResolvedValue(null);
    tx.creditReservation.updateMany.mockResolvedValue({ count: 1 });
    tx.creditWallet.upsert.mockResolvedValue({ id: "wallet_1", balance: 10 });
    tx.creditWallet.updateMany.mockResolvedValue({ count: 1 });
    tx.$queryRaw.mockResolvedValue([{ id: "wallet_1", balance: 10, reserved: 0 }]);
    tx.creditGrant.aggregate.mockResolvedValue({ _sum: { remaining: 10 } });
    tx.creditReservation.create.mockResolvedValue({
      id: "reservation_1",
      userId: "user_1",
      requestId: "request_1",
      action: "rewrite_section",
      cost: 7,
      status: "PENDING",
    });
  });

  it("atomically moves available credits into a reservation", async () => {
    const { CreditService } = await import("../../src/services/creditService.js");

    const reservation = await CreditService.reserveAction(
      "user_1",
      "rewrite_section",
      "standard",
      "request_1",
    );

    expect(reservation).toMatchObject({ cost: 7, status: "PENDING" });
    expect(tx.creditWallet.updateMany).toHaveBeenCalledWith({
      where: { id: "wallet_1", balance: { gte: 7 } },
      data: { balance: { decrement: 7 }, reserved: { increment: 7 } },
    });
  });

  it("commits a reservation and allocates the oldest valid grant", async () => {
    const { CreditService } = await import("../../src/services/creditService.js");
    tx.creditReservation.findUnique.mockResolvedValue({
      id: "reservation_1",
      walletId: "wallet_1",
      userId: "user_1",
      requestId: "request_1",
      action: "rewrite_section",
      cost: 7,
      status: "PENDING",
      createdAt: new Date("2026-06-11T00:00:00Z"),
    });
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: "wallet_1", balance: 3, reserved: 7 }])
      .mockResolvedValueOnce([{ id: "grant_1", remaining: 10 }]);
    tx.creditGrant.updateMany.mockResolvedValue({ count: 1 });
    tx.creditTransaction.create.mockResolvedValue({ id: "debit_1", balanceAfter: 3 });

    const result = await CreditService.commitReservation("user_1", "request_1", {
      referenceId: "generation_1",
    });

    expect(result).toMatchObject({ id: "debit_1", balanceAfter: 3 });
    // The flip is conditional on PENDING and happens before any wallet or grant write.
    expect(tx.creditReservation.updateMany).toHaveBeenCalledWith({
      where: { id: "reservation_1", status: "PENDING" },
      data: { status: "COMMITTED" },
    });
    expect(tx.creditGrant.updateMany).toHaveBeenCalledWith({
      where: { id: "grant_1", remaining: { gte: 7 } },
      data: { remaining: { decrement: 7 } },
    });
    expect(tx.creditWallet.updateMany).toHaveBeenCalledWith({
      where: { id: "wallet_1", reserved: { gte: 7 } },
      data: { reserved: { decrement: 7 }, lifetimeDebited: { increment: 7 } },
    });
  });

  it("refuses to commit a reservation that is no longer pending without touching the wallet", async () => {
    const { CreditService } = await import("../../src/services/creditService.js");
    tx.creditReservation.findUnique.mockResolvedValue({
      id: "reservation_1",
      walletId: "wallet_1",
      userId: "user_1",
      requestId: "request_1",
      action: "rewrite_section",
      cost: 7,
      status: "PENDING",
      createdAt: new Date("2026-06-11T00:00:00Z"),
    });
    // The release sweep won the race between our read and our conditional flip.
    tx.creditReservation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      CreditService.commitReservation("user_1", "request_1", { referenceId: "generation_1" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    // Lock order: the wallet row is locked before the conditional flip, never after it.
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.creditReservation.updateMany.mock.invocationCallOrder[0]!,
    );
    expect(tx.creditGrant.updateMany).not.toHaveBeenCalled();
    expect(tx.creditWallet.updateMany).not.toHaveBeenCalled();
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it("returns reserved credits when generation fails", async () => {
    const { CreditService } = await import("../../src/services/creditService.js");
    tx.creditReservation.findUnique.mockResolvedValue({
      id: "reservation_1",
      walletId: "wallet_1",
      userId: "user_1",
      requestId: "request_1",
      cost: 7,
      status: "PENDING",
    });

    await expect(CreditService.releaseReservation("user_1", "request_1")).resolves.toBe(true);
    expect(tx.creditWallet.updateMany).toHaveBeenCalledWith({
      where: { id: "wallet_1", reserved: { gte: 7 } },
      data: { balance: { increment: 7 }, reserved: { decrement: 7 } },
    });
  });

  it("S-384 a retry while the first request is still running is told to wait, with a code", async () => {
    const { CreditService } = await import("../../src/services/creditService.js");
    tx.creditReservation.findUnique.mockResolvedValue({
      id: "reservation_1",
      userId: "user_1",
      requestId: "request_1",
      action: "rewrite_section",
      cost: 7,
      status: "PENDING",
    });

    await expect(
      CreditService.reserveAction("user_1", "rewrite_section", "standard", "request_1"),
    ).rejects.toMatchObject({
      statusCode: 409,
      details: { code: "AI_REQUEST_PROCESSING", retryAfterSeconds: expect.any(Number) },
    });
    expect(tx.creditReservation.create).not.toHaveBeenCalled();
  });

  it("S-384 a retry just after the charge, before its result is stored, is told to wait", async () => {
    const { CreditService } = await import("../../src/services/creditService.js");
    const committed = {
      id: "reservation_1",
      userId: "user_1",
      requestId: "request_1",
      action: "rewrite_section",
      cost: 7,
      status: "COMMITTED",
      replay: null,
    };

    tx.creditReservation.findUnique.mockResolvedValue({ ...committed, updatedAt: new Date() });
    await expect(
      CreditService.reserveAction("user_1", "rewrite_section", "standard", "request_1"),
    ).rejects.toMatchObject({ statusCode: 409, details: { code: "AI_REQUEST_PROCESSING" } });

    // Long after the commit, a missing result is never coming (or was cleared): the id is spent.
    tx.creditReservation.findUnique.mockResolvedValue({
      ...committed,
      updatedAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    await expect(
      CreditService.reserveAction("user_1", "rewrite_section", "standard", "request_1"),
    ).rejects.toMatchObject({ statusCode: 409, message: "This AI request already completed." });
  });
});
