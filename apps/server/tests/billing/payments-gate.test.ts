import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-182: the payments gate (admin-only purchases in production) must never stand between a
 * customer and the billing portal, where they cancel and manage what they already pay for. The
 * delete-blocked 409 sends subscribers there.
 */

const mocks = vi.hoisted(() => ({
  createPortal: vi.fn(),
  createCheckout: vi.fn(),
  createCreditPackCheckout: vi.fn(),
  previewPlanChange: vi.fn(),
  changePlan: vi.fn(),
}));

vi.mock("#config", () => ({ isProduction: true, config: {} }));
vi.mock("#lib/isAdminUser", () => ({ isAdminUser: () => false }));
vi.mock("#middleware/auth", () => ({
  requireAuthUser: () => ({ id: "user-1", email: "customer@example.test" }),
}));
vi.mock("#services/billingService", () => ({ BillingService: mocks }));
vi.mock("#services/creditService", () => ({ CreditService: {} }));

const { BillingController } = await import("#controllers/billingController");

function call(handler: (req: never, res: never, next: never) => Promise<void>, body = {}) {
  const res = { json: vi.fn() };
  const next = vi.fn();
  const req = { body, get: () => undefined };
  return handler(req as never, res as never, next as never).then(() => ({ res, next }));
}

describe("payments gate", () => {
  beforeEach(() => {
    mocks.createPortal.mockReset().mockResolvedValue({ url: "https://portal.example" });
  });

  it("lets a regular customer open the billing portal in production", async () => {
    const { res, next } = await call(BillingController.portal);

    expect(next).not.toHaveBeenCalled();
    expect(mocks.createPortal).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { url: "https://portal.example" } }),
    );
  });

  it("still blocks new purchases for non-admins in production", async () => {
    const { next } = await call(BillingController.checkout, {
      productKey: "portfolio_pro",
      interval: "monthly",
    });

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  // V-378: the credit-pack checkout is a purchase too.
  it("blocks credit-pack checkout for non-admins in production", async () => {
    const { next } = await call(BillingController.creditPackCheckout, {
      packKey: "credit_pack_250",
    });

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(mocks.createCreditPackCheckout).not.toHaveBeenCalled();
  });

  it("V-202: blocks the plan-change preview and the plan change for non-admins in production", async () => {
    const body = { productKey: "bundle", interval: "monthly", idempotencyKey: "change-1" };

    const preview = await call(BillingController.previewPlanChange, body);
    const change = await call(BillingController.changePlan, body);

    expect(preview.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(change.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(mocks.previewPlanChange).not.toHaveBeenCalled();
    expect(mocks.changePlan).not.toHaveBeenCalled();
  });
});
