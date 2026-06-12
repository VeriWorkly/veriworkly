import type { LucideIcon } from "lucide-react";

import {
  Database,
  KeyRound,
  FileJson,
  ArrowRight,
  BadgeCheck,
  Fingerprint,
  ShieldCheck,
  Trophy,
  Coins,
  CreditCard,
} from "lucide-react";

import Link from "next/link";

const profileLinks = [
  {
    href: "/billing",
    icon: CreditCard,
    title: "Billing and plan",
    text: "Manage your current plan, renewals, billing activity, and extra credits.",
  },
  {
    href: "/credits",
    icon: Coins,
    title: "AI credit usage",
    text: "Review credit balance, expiry, action costs, and usage history.",
  },
  {
    href: "/affiliate",
    icon: Trophy,
    title: "Affiliate program",
    text: "Join or manage referrals, commissions, tiers, and payouts.",
  },
  {
    href: "/profile/master",
    icon: Database,
    title: "Master career data",
    text: "Reusable resume source data. Separate from user account profile.",
  },

  {
    href: "/profile/advanced",
    icon: FileJson,
    title: "Advanced JSON",
    text: "Inspect, import, export, and repair master profile data.",
  },

  {
    href: "/api-keys",
    icon: KeyRound,
    title: "API keys",
    text: "Manage scoped developer tokens.",
  },
];

function LayerCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="border-border bg-background/70 rounded-2xl border p-4">
      <Icon className="text-accent h-5 w-5" />
      <h2 className="mt-4 text-sm font-black">{title}</h2>
      <p className="text-muted mt-1 text-sm leading-6">{text}</p>
    </article>
  );
}

function ProfileLink({
  href,
  icon: Icon,
  title,
  text,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group border-border bg-card hover:border-accent/50 block rounded-2xl border p-4 transition hover:shadow-sm"
    >
      <span className="flex items-start justify-between gap-4">
        <span className="bg-accent/10 text-accent flex h-11 w-11 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" />
        </span>

        <ArrowRight className="text-muted group-hover:text-accent h-5 w-5 transition group-hover:translate-x-1" />
      </span>

      <span className="mt-5 block text-base font-black">{title}</span>
      <span className="text-muted mt-1 block text-sm leading-6">{text}</span>
    </Link>
  );
}

export function ProfileLinksGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {profileLinks.map((item) => (
        <ProfileLink key={item.href} {...item} />
      ))}
    </div>
  );
}

export function ProfileDataLayers() {
  return (
    <section className="grid gap-4 lg:grid-cols-3" aria-label="Profile data layers">
      <LayerCard
        icon={Fingerprint}
        title="User account"
        text="Name, email, sync state, and account timestamps."
      />

      <LayerCard
        icon={BadgeCheck}
        title="Workspace stats"
        text="Documents, share links, and API keys attached to this user."
      />

      <LayerCard
        icon={ShieldCheck}
        title="Career data source"
        text="Master profile stores reusable resume facts, not account identity."
      />
    </section>
  );
}
