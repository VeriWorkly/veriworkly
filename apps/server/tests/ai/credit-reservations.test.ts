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
    updateMany: vi.fn(),
  },
  creditTransaction: {
    create: vi.fn(),
  },
  creditUsageAllocation: {
    createMany: vi.fn(),
  },
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

vi.mock("../../src/utils/prisma", () => ({ prisma, default: prisma }));
vi.mock("../../src/utils/redis", () => ({
  cacheDel: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));
vi.mock("../../src/services/aiPolicy", () => ({
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
    const { CreditService } = await import("../../src/services/creditService");

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
    const { CreditService } = await import("../../src/services/creditService");
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
    tx.creditGrant.findMany.mockResolvedValue([{ id: "grant_1", remaining: 10 }]);
    tx.creditGrant.updateMany.mockResolvedValue({ count: 1 });
    tx.creditWallet.update.mockResolvedValue({ balance: 3 });
    tx.creditTransaction.create.mockResolvedValue({ id: "debit_1", balanceAfter: 3 });

    const result = await CreditService.commitReservation("user_1", "request_1", {
      referenceId: "generation_1",
    });

    expect(result).toMatchObject({ id: "debit_1", balanceAfter: 3 });
    expect(tx.creditWallet.update).toHaveBeenCalledWith({
      where: { id: "wallet_1" },
      data: { reserved: { decrement: 7 }, lifetimeDebited: { increment: 7 } },
    });
    expect(tx.creditReservation.update).toHaveBeenCalledWith({
      where: { id: "reservation_1" },
      data: { status: "COMMITTED" },
    });
  });

  it("returns reserved credits when generation fails", async () => {
    const { CreditService } = await import("../../src/services/creditService");
    tx.creditReservation.findUnique.mockResolvedValue({
      id: "reservation_1",
      walletId: "wallet_1",
      userId: "user_1",
      requestId: "request_1",
      cost: 7,
      status: "PENDING",
    });

    await expect(CreditService.releaseReservation("user_1", "request_1")).resolves.toBe(true);
    expect(tx.creditWallet.update).toHaveBeenCalledWith({
      where: { id: "wallet_1" },
      data: { balance: { increment: 7 }, reserved: { decrement: 7 } },
    });
  });
});
