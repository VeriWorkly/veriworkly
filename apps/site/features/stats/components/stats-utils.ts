import type {
  GitHubStatus,
  GitHubFilterKind,
  GitHubFilterStatus,
} from "@/features/github/services/github-backend";

export const PAGE_SIZE = 20;

/** 5,000 items. A page past it is a 404 without a backend call, so page numbers cannot spend the API's rate limit. */
export const MAX_PAGE = 250;

export const STATUS_META: Record<GitHubStatus, { label: string; dot: string }> = {
  todo: { label: "To do", dot: "bg-foreground/25" },
  "in-progress": { label: "In progress", dot: "bg-warning" },
  done: { label: "Done", dot: "bg-success" },
};

export const statusOptions: Array<{
  value: GitHubFilterStatus;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
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

/** Explicit UTC: server locale showed an unlabelled UTC time, and a client conversion would mismatch on hydration. */
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
}) {
  const searchParams = new URLSearchParams();

  if (input.status !== "all") {
    searchParams.set("status", input.status);
  }

  if (input.kind !== "all") {
    searchParams.set("kind", input.kind);
  }

  if (input.page > 1) {
    searchParams.set("page", String(input.page));
  }

  const queryString = searchParams.toString();
  return queryString ? `/stats?${queryString}` : "/stats";
}
