import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = {
  creditWallet: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  creditGrant: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  creditUsageAllocation: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
  creditTransaction: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

const prismaMock = {
  creditReservation: {
    count: vi.fn().mockResolvedValue(0),
  },
  creditWallet: {
    upsert: vi.fn(),
  },
  creditGrant: {
    findMany: vi.fn(),
  },
  creditTransaction: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(txMock)),
};

vi.mock("../../src/utils/prisma", () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock("../../src/utils/redis", () => ({
  cacheDel: vi.fn().mockResolvedValue(undefined),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/services/aiPolicy", () => ({
  getAiModePolicy: vi.fn((action: string) => ({
    credits: action === "rewrite_short_text" ? 7 : 11,
  })),
}));

describe("credit ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.creditTransaction.findUnique.mockResolvedValue(null);
    prismaMock.creditGrant.findMany.mockResolvedValue([]);
  });

  it("uses deterministic action prices", async () => {
    const { CreditService } = await import("../../src/services/creditService");

    expect(CreditService.costFor("rewrite_short_text")).toBe(7);
    expect(CreditService.costFor("generate_document")).toBe(11);
  });

  it("grants credits and records the resulting balance", async () => {
    const { CreditService } = await import("../../src/services/creditService");
    txMock.creditWallet.upsert.mockResolvedValue({
      id: "wallet_1",
      balance: 100,
      lifetimeCredited: 100,
    });
    txMock.creditTransaction.create.mockResolvedValue({
      id: "credit_1",
      amount: 100,
      balanceAfter: 100,
    });
    txMock.creditGrant.create.mockResolvedValue({ id: "grant_1" });

    const result = await CreditService.grant("user_1", 100, {
      requestId: "grant_1",
      reason: "subscription allowance",
      source: "subscription_payment",
      sourceId: "payment_1",
    });

    expect(result).toMatchObject({ amount: 100, balanceAfter: 100 });
    expect(txMock.creditTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        amount: 100,
        balanceAfter: 100,
        requestId: "grant_1",
        type: "GRANT",
      }),
    });
  });

  it("returns an existing debit for the same request id", async () => {
    const { CreditService } = await import("../../src/services/creditService");
    const existing = { id: "credit_1", userId: "user_1", amount: -5, balanceAfter: 25 };
    txMock.creditTransaction.findUnique.mockResolvedValue(existing);

    await expect(
      CreditService.consume("user_1", 5, { requestId: "rewrite_1", action: "resume_rewrite" }),
    ).resolves.toEqual(existing);
    expect(txMock.creditWallet.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a debit when the wallet has insufficient credits", async () => {
    const { CreditService } = await import("../../src/services/creditService");
    txMock.creditWallet.upsert.mockResolvedValue({ id: "wallet_1", balance: 2 });

    await expect(
      CreditService.consume("user_1", 5, { requestId: "rewrite_2", action: "resume_rewrite" }),
    ).rejects.toThrow("Not enough AI credits");
    expect(txMock.creditTransaction.create).not.toHaveBeenCalled();
  });
});
