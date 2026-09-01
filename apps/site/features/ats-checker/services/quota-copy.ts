import type { AtsQuota } from "../types";

export function allowanceCopy(quota: AtsQuota): string {
  switch (quota.tier) {
    case "anonymous":
      return `${quota.limit} scan${quota.limit === 1 ? "" : "s"} every 48 hours`;
    case "free":
      return `${quota.limit} scan${quota.limit === 1 ? "" : "s"} a day`;
    case "subscriber":
      return `${quota.limit} scan${quota.limit === 1 ? "" : "s"} this billing period`;
    default:
      return `${quota.limit} scans`;
  }
}

export function resetCopy(resetsAt: string): string {
  if (!resetsAt) return "soon";

  const target = new Date(resetsAt).getTime();
  if (Number.isNaN(target)) return "soon";

  const diffMs = target - Date.now();
  if (diffMs <= 0) return "in under a minute";

  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) {
    const minutes = Math.max(1, diffMinutes);
    return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const diffHours = Math.round(diffMs / 3_600_000);
  if (diffHours < 24) {
    const hours = Math.max(1, diffHours);
    return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.max(1, Math.round(diffMs / 86_400_000));
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
