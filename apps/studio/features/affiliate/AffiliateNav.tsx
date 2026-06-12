import Link from "next/link";

const links = [
  ["/affiliate", "Overview"],
  ["/affiliate/referrals", "Referrals"],
  ["/affiliate/commissions", "Commissions"],
  ["/affiliate/leaderboard", "Leaderboard"],
  ["/affiliate/payouts", "Payouts"],
  ["/affiliate/tiers", "Tiers"],
] as const;

export function AffiliateNav() {
  return <nav className="border-border bg-card flex gap-1 overflow-x-auto rounded-xl border p-1" aria-label="Affiliate navigation">{links.map(([href, label]) => <Link className="text-muted hover:bg-background hover:text-foreground shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition" href={href} key={href}>{label}</Link>)}</nav>;
}
