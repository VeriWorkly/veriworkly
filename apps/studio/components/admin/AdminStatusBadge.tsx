import { cn } from "@veriworkly/ui";

import { humanizeKey } from "@/features/admin/utils/admin-format";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

/**
 * Status tones are built from the theme's semantic tokens (`--success`, `--warning`,
 * `--destructive`, `--accent`), not from raw Tailwind palette steps.
 *
 * The previous version hardcoded `emerald-700 / amber-700 / red-700 / sky-700`, which meant the
 * admin ran a second, parallel colour language next to the one `themes.css` defines: retuning
 * the brand's success green left every admin badge on the old hue. Going through the tokens
 * means a theme change reaches here for free, and light/dark are handled by the token
 * definitions rather than by a `dark:` variant on every line.
 */
const toneStyles: Record<Tone, string> = {
  neutral: "bg-muted/10 text-muted ring-muted/20",
  success: "bg-success/10 text-success ring-success/25",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  info: "bg-accent/10 text-accent ring-accent/25",
};

/**
 * One mapping for every status enum in the admin surface. Centralised so "ACTIVE" is the same
 * green on the users table, the affiliates table and the subscriptions table — inconsistent
 * status colours are how an operator misreads a row.
 */
const STATUS_TONES: Record<string, Tone> = {
  // Lifecycle / moderation
  ACTIVE: "success",
  LIVE: "success",
  APPROVED: "success",
  PROCESSED: "success",
  AVAILABLE: "success",
  READY: "success",
  CONVERTED: "success",
  PAID: "success",
  ok: "success",

  PENDING: "warning",
  REQUESTED: "warning",
  PROCESSING: "warning",
  GRACE: "warning",
  PAST_DUE: "warning",
  degraded: "warning",
  SIGNED_UP: "warning",

  SUSPENDED: "danger",
  REJECTED: "danger",
  FAILED: "danger",
  REVERSED: "danger",
  CANCELED: "danger",
  down: "danger",

  INACTIVE: "neutral",
  NOT_ENROLLED: "neutral",
  NONE: "neutral",

  // Visibility
  PUBLIC: "info",
  UNLISTED: "warning",
  PRIVATE: "neutral",

  // Affiliate tiers
  TIER_1: "neutral",
  TIER_2: "info",
  TIER_3: "success",

  // Roles
  ADMIN: "danger",
  AMBASSADOR: "info",
  USER: "neutral",
};

interface AdminStatusBadgeProps {
  status: string | null | undefined;
  /** Overrides the lookup when a status word means something different in context. */
  tone?: Tone;
  /** Adds a filled dot before the label, for badges read at a glance in a dense table. */
  dot?: boolean;
  className?: string;
}

const AdminStatusBadge = ({ status, tone, dot, className }: AdminStatusBadgeProps) => {
  if (!status) return <span className="text-muted text-xs">—</span>;

  const resolvedTone = tone ?? STATUS_TONES[status] ?? "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        toneStyles[resolvedTone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {humanizeKey(status)}
    </span>
  );
};

export default AdminStatusBadge;
