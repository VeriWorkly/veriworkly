import { API_KEY_SCOPE_OPTIONS } from "../ApiKeyScopes";

export const scopeOptionMap = new Map<string, (typeof API_KEY_SCOPE_OPTIONS)[number]>(
  API_KEY_SCOPE_OPTIONS.map((scope) => [scope.value, scope]),
);

export function formatDateTime(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function statusClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
    : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
}
