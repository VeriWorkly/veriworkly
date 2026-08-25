import type {
  GitHubFilterKind,
  GitHubFilterStatus,
} from "@/features/github/services/github-backend";

export const PAGE_SIZE = 20;

export const statusOptions: Array<{
  value: GitHubFilterStatus;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const kindOptions: Array<{ value: GitHubFilterKind; label: string }> = [
  { value: "all", label: "All items" },
  { value: "issue", label: "Issues" },
  { value: "pull-request", label: "Pull requests" },
];

export function parseStatus(raw: string | undefined): GitHubFilterStatus {
  if (raw === "todo" || raw === "in-progress" || raw === "done") {
    return raw;
  }

  return "all";
}

export function parseKind(raw: string | undefined): GitHubFilterKind {
  if (raw === "issue" || raw === "pull-request") {
    return raw;
  }

  return "all";
}

export function parsePage(raw: string | undefined) {
  const parsed = Number.parseInt(raw ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function parseDateInput(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

export function dateFromToIso(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const d = new Date(`${date}T00:00:00.000Z`);

  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function dateToToIso(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const d = new Date(`${date}T23:59:59.999Z`);

  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function formatRelativeTime(input: string | null | undefined): string {
  if (!input) return "not synced yet";

  const date = new Date(input);

  if (isNaN(date.getTime())) return "just now";

  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
  if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");

  return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
}

/**
 * Formats an absolute timestamp in UTC, labelled as such.
 *
 * This used to be a bare `toLocaleString()` on a *server*-rendered component. Node picks
 * the container's locale and timezone - in practice `en-US` and UTC - so every visitor was
 * shown a UTC clock time with no indication that it was not their own. Someone in IST read
 * "next sync 6:00:00 PM" and was five and a half hours out.
 *
 * Rendering it explicitly in UTC is unambiguous for everyone and, unlike a client-side
 * conversion, produces the same string on the server and after hydration.
 */
export function formatAbsoluteTime(input: string | null | undefined) {
  if (!input) {
    return "not scheduled";
  }

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return "not scheduled";
  }

  return `${date.toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} UTC`;
}

export function buildSearchHref(input: {
  status: GitHubFilterStatus;
  kind: GitHubFilterKind;
  page: number;
  updatedFrom?: string;
  updatedTo?: string;
}) {
  const searchParams = new URLSearchParams();

  if (input.status !== "all") {
    searchParams.set("status", input.status);
  }

  if (input.kind !== "all") {
    searchParams.set("kind", input.kind);
  }

  if (input.updatedFrom) {
    searchParams.set("updatedFrom", input.updatedFrom);
  }

  if (input.updatedTo) {
    searchParams.set("updatedTo", input.updatedTo);
  }

  if (input.page > 1) {
    searchParams.set("page", String(input.page));
  }

  const queryString = searchParams.toString();
  return queryString ? `/stats?${queryString}` : "/stats";
}
