import type { AtsRequirement } from "../types";

export const REQUIREMENT_STATUS_LABELS: Record<AtsRequirement["status"], string> = {
  met: "Met",
  partial: "Partly met",
  missing: "Not shown",
  unverifiable: "Answer in the application",
};

const STATUS_ORDER = { missing: 0, partial: 1, unverifiable: 2, met: 3 } as const;

/** Must-haves before nice-to-haves, then the gaps first: the order the panel and the copied report share. */
export function sortRequirements(requirements: readonly AtsRequirement[]): AtsRequirement[] {
  return [...requirements].sort(
    (a, b) =>
      Number(a.importance === "preferred") - Number(b.importance === "preferred") ||
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );
}
