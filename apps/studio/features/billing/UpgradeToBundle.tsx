"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@veriworkly/ui";

import { LocalDate } from "@/components/LocalDate";
import { formatCents } from "@/features/admin/utils/admin-format";
import { createRequestId } from "@/features/ai/ai-api";
import { changePlan, openBillingPortal, previewPlanChange } from "@/features/billing/billing-api";
import {
  type CheckoutFailure,
  describeCheckoutError,
  PLAN_NAMES,
  type PlanUpgrade,
} from "@/features/billing/checkout-rules";
import { recordPurchaseBaseline } from "@/features/billing/purchase-baseline";
import type { PlanChangePreview } from "@/features/billing/types";

type PreviewState =
  | { state: "loading" }
  | { state: "ready"; preview: PlanChangePreview }
  | { state: "failed"; failure: CheckoutFailure };

/**
 * The in-place upgrade of a live subscription (V-202). The dialog prices the change first (what
 * is due now, the next amount and the renewal date, as the provider calculates them); confirming
 * sends it with one idempotency key per opening, so a retried click is answered with the first
 * request's result instead of a second charge. The plan changes only when the payment webhook
 * lands, so a sent change returns to the billing page, which waits for it like a checkout return.
 */
export function UpgradeToBundle({
  upgrade,
  className,
}: {
  upgrade: PlanUpgrade;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ state: "loading" });
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<CheckoutFailure | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  const target = PLAN_NAMES[upgrade.productKey];

  const loadPreview = () => {
    setPreview({ state: "loading" });
    previewPlanChange(upgrade.productKey, upgrade.interval)
      .then((next) => setPreview({ state: "ready", preview: next }))
      .catch((cause) =>
        setPreview({
          state: "failed",
          failure: describeCheckoutError(cause, "The upgrade could not be priced."),
        }),
      );
  };

  const openDialog = () => {
    setIdempotencyKey(createRequestId());
    setFailure(null);
    setOpen(true);
    loadPreview();
  };

  const confirm = async () => {
    setConfirming(true);
    setFailure(null);
    try {
      await recordPurchaseBaseline(upgrade.productKey);
      await changePlan(upgrade.productKey, upgrade.interval, idempotencyKey);
      setOpen(false);
      setConfirming(false);
      router.push("/billing?checkout=upgrade");
    } catch (cause) {
      setFailure(describeCheckoutError(cause, "The upgrade could not be started."));
      setConfirming(false);
    }
  };

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      window.location.assign((await openBillingPortal()).url);
    } catch (cause) {
      setFailure(describeCheckoutError(cause, "Could not open the billing portal."));
      setOpeningPortal(false);
    }
  };

  const shownFailure = failure ?? (preview.state === "failed" ? preview.failure : null);
  const period = upgrade.interval === "annual" ? "year" : "month";

  return (
    <>
      <Button className={className} onClick={openDialog}>
        Upgrade to {target}
      </Button>

      <Modal
        open={open}
        onClose={() => {
          if (!confirming) setOpen(false);
        }}
      >
        <Modal.Content className="md:max-w-md">
          <Modal.Header>
            <Modal.Title>Upgrade to the {target}</Modal.Title>
            <Modal.Description>
              Pay only the difference for the rest of this billing period. Your renewal date stays
              the same.
            </Modal.Description>
          </Modal.Header>

          <Modal.Body className="space-y-3 text-sm">
            {preview.state === "loading" ? (
              <p className="text-muted">Working out the price…</p>
            ) : preview.state === "ready" ? (
              <dl className="bg-background grid gap-2 rounded-xl p-4">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Due now</dt>
                  <dd className="font-black">
                    {formatCents(preview.preview.dueNow, preview.preview.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Then</dt>
                  <dd className="text-right font-bold">
                    {formatCents(preview.preview.nextAmount, preview.preview.currency)} per {period}{" "}
                    from <LocalDate value={preview.preview.nextBillingDate} />
                  </dd>
                </div>
              </dl>
            ) : null}

            {shownFailure ? (
              <div
                role={shownFailure.kind === "payments-closed" ? "status" : "alert"}
                className={
                  shownFailure.kind === "payments-closed"
                    ? "border-accent/30 bg-accent/10 text-accent rounded-xl border p-3"
                    : "border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-3"
                }
              >
                <p>{shownFailure.message}</p>
                {shownFailure.kind === "manage-billing" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    loading={openingPortal}
                    onClick={() => void openPortal()}
                  >
                    Manage billing
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Modal.Body>

          <Modal.Footer className="-mx-6 -mb-6 rounded-b-3xl">
            <Button variant="ghost" size="sm" disabled={confirming} onClick={() => setOpen(false)}>
              Not now
            </Button>
            <Button
              size="sm"
              loading={confirming}
              disabled={preview.state !== "ready"}
              onClick={() => void confirm()}
            >
              Upgrade and pay now
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
}
