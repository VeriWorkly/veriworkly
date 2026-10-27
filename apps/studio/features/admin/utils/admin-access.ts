import type { AdminUserDetail } from "@/features/admin/types/admin-types";
import type { ProductKey } from "@/features/billing/types";
import { PLAN_NAMES } from "@/features/billing/checkout-rules";
import { formatDate, formatNumber, humanizeKey } from "@/features/admin/utils/admin-format";

type Grant = AdminUserDetail["entitlements"][number];

/** The server's pass grant (`isPassGrant`): a SYSTEM grant whose metadata says `pass: true`. */
function isPassGrant(grant: Grant) {
  return grant.source === "SYSTEM" && grant.metadata?.pass === true;
}

function inEffect(grant: Grant, now: number) {
  return (
    !grant.revokedAt &&
    Date.parse(grant.startsAt) <= now &&
    (grant.endsAt === null || Date.parse(grant.endsAt) > now)
  );
}

/**
 * What a user has, for the top of their admin page, worked out as the server's
 * `describeAccess` does from the grants in effect: a plan (a subscription's grants, or an admin
 * comp of them), else a pass; a subscription in dunning keeps its plan name, flagged.
 *
 * The admin API does not send which credits were paid for, so a user with neither a plan nor a
 * pass is "Free" only when nothing was ever credited to them and they never subscribed. Anyone
 * else may have bought a credit pack, and a payer must never read as free.
 */
export function describeAdminAccess(detail: AdminUserDetail, now = Date.now()) {
  const grants = detail.entitlements.filter((grant) => inEffect(grant, now));

  const planGrant = (key: string) =>
    grants.some((grant) => grant.key === key && !isPassGrant(grant));
  const portfolio = planGrant("portfolio_publish");
  const ai = planGrant("ai_credits");
  // Dunning revokes the grants while the card is retried; the customer is still a subscriber.
  // As the server (`buildSummary`): only while the grace window runs, and only for a product.
  const dunning = detail.subscriptions.find(
    (subscription) =>
      subscription.status === "PAST_DUE" &&
      subscription.graceEndsAt !== null &&
      Date.parse(subscription.graceEndsAt) > now &&
      subscription.productKey in PLAN_NAMES,
  );
  const passes = grants.filter(isPassGrant);
  const comps = grants.filter((grant) => grant.source === "MANUAL" || grant.source === "PROMOTION");

  const wallet = detail.credits.wallet;
  const mayHavePaid = detail.subscriptions.length > 0 || (wallet?.lifetimeCredited ?? 0) > 0;

  const label =
    portfolio && ai
      ? PLAN_NAMES.bundle
      : portfolio
        ? PLAN_NAMES.portfolio_pro
        : ai
          ? PLAN_NAMES.ai_credits
          : passes.length > 0
            ? "Job Hunter pass"
            : dunning
              ? `${PLAN_NAMES[dunning.productKey as ProductKey]} (payment issue)`
              : mayHavePaid
                ? "No plan or pass"
                : "Free";

  const details: string[] = [];

  if (dunning?.graceEndsAt) {
    details.push(
      `Payment issue: ${PLAN_NAMES[dunning.productKey as ProductKey]} is past due; the card is retried until ${formatDate(dunning.graceEndsAt)}`,
    );
  }

  const passEnds = passes.map((grant) => grant.endsAt).filter((end): end is string => !!end);
  if (passes.length > 0) {
    details.push(
      passEnds.length === passes.length
        ? `Pass until ${formatDate(passEnds.sort().at(-1))}`
        : "Pass with no end date",
    );
  }

  for (const grant of comps) {
    details.push(
      `${humanizeKey(grant.source)} grant: ${humanizeKey(grant.key)}${grant.endsAt ? ` until ${formatDate(grant.endsAt)}` : ""}`,
    );
  }

  if (wallet) {
    details.push(
      `${formatNumber(wallet.balance)} credits (${formatNumber(wallet.lifetimeCredited)} credited in all)`,
    );
  }

  return { label, details };
}
