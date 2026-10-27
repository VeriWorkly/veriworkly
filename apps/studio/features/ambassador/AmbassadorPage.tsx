import Link from "next/link";
import {
  BadgeCheck,
  CalendarClock,
  DollarSign,
  GraduationCap,
  Hourglass,
  Megaphone,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { Button } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { ShareToolkit } from "@/features/ambassador/ShareToolkit";
import { isApprovedAmbassador, type AmbassadorStatus } from "@/features/ambassador/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : dateFormatter.format(parsed);
}

export function AmbassadorPage({ status }: { status: AmbassadorStatus | null }) {
  const isAmbassador = isApprovedAmbassador(status);
  const application = status?.application ?? null;
  const isRejected = application?.status === "REJECTED";
  const isPending = !isAmbassador && !isRejected;

  const submittedAt = formatDate(application?.submittedAt);
  const reviewedAt = formatDate(application?.reviewedAt);
  const firstName = status?.name?.split(" ")[0];

  return (
    <main className="space-y-5">
      <section className="border-border bg-card rounded-2xl border p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black">
              <Trophy className="h-6 w-6 text-amber-500" />
              Campus Ambassador Program
            </h1>
            <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
              {isAmbassador
                ? `Welcome to the crew${firstName ? `, ${firstName}` : ""}. Your share toolkit is below — everything you need to start repping VeriWorkly on campus.`
                : isRejected
                  ? "This round didn't work out, but applications reopen — you can send a new one whenever you're ready."
                  : "Your application is in review. Check back here for the decision."}
            </p>
          </div>

          {isAmbassador ? (
            <StatusPill tone="emerald" label="Active Campus Ambassador" pulse />
          ) : isRejected ? (
            <StatusPill tone="destructive" label="Not accepted this round" />
          ) : (
            <StatusPill tone="amber" label="Application Under Review" pulse />
          )}
        </div>
      </section>

      {/* Progress through review — real dates, not a decorative stepper. */}
      <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
        <h2 className="text-lg font-black">Where your application stands</h2>
        <ol className="mt-5 space-y-4">
          <TimelineStep
            icon={CalendarClock}
            state="done"
            title="Application submitted"
            detail={submittedAt ? `Sent ${submittedAt}` : "Received"}
          />
          <TimelineStep
            icon={Hourglass}
            state={isPending ? "current" : "done"}
            title="Team review"
            detail={
              isPending
                ? "Usually a few days. We read every single one."
                : reviewedAt
                  ? `Reviewed ${reviewedAt}`
                  : "Reviewed"
            }
          />
          <TimelineStep
            icon={isRejected ? XCircle : BadgeCheck}
            state={isPending ? "upcoming" : isRejected ? "rejected" : "done"}
            title="Decision"
            detail={
              isPending
                ? "It will appear on this page."
                : isRejected
                  ? "Not accepted this round."
                  : "Approved — you're in."
            }
          />
        </ol>

        {!isPending && application?.reviewNote && (
          <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
            <p className="text-[10px] font-black tracking-widest text-amber-600 uppercase">
              Note from the reviewer
            </p>
            <p className="mt-1.5 text-sm leading-6">{application.reviewNote}</p>
          </div>
        )}

        {isRejected && (
          <Button asChild className="mt-5">
            <Link href={`${siteConfig.links.main}/ambassador/apply`}>Apply again</Link>
          </Button>
        )}
      </section>

      {application && (
        <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-black">What you told us</h2>
            {/* The server refuses changes to an application still in review. */}
            {!isPending && (
              <Link
                className="text-accent shrink-0 text-sm font-bold"
                href={`${siteConfig.links.main}/ambassador/apply`}
              >
                {isAmbassador ? "View program page" : "Update"}
              </Link>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail
              icon={GraduationCap}
              label="Campus"
              value={`${application.collegeName} · Class of ${application.graduationYear}`}
            />
            {application.vibeCheck && (
              <Detail icon={Sparkles} label="Campus vibe" value={application.vibeCheck} />
            )}
            <Detail icon={Megaphone} label="Superpower" value={application.superpower} />
            <Detail icon={Sparkles} label="Fun fact" value={application.funFact} />
          </div>
        </section>
      )}

      {isAmbassador && (
        <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
          <h2 className="text-lg font-black">Share toolkit</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Copy-ready posts for the places your peers actually are. Edit them so they sound like
            you — the ones that work never sound like an ad.
          </p>
          <ShareToolkit siteUrl={siteConfig.links.main} />
        </section>
      )}

      {/*
        The affiliate program is the earning mechanism that is actually wired end to end:
        real click tracking, real commissions, real payouts. Ambassador points and the
        campus leaderboard have no data model behind them yet, so this points at what
        genuinely pays rather than showing invented numbers.
      */}
      <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <DollarSign className="text-accent h-5 w-5" />
              Want tracked referrals and payouts?
            </h2>
            <p className="text-muted mt-2 max-w-xl text-sm leading-6">
              The affiliate program gives you a personal referral link with real click tracking and
              recurring commission on paid conversions. It stacks with your ambassador status.
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href="/affiliate">Open affiliate program</Link>
          </Button>
        </div>
      </section>

      <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
        <h2 className="text-lg font-black">Coming to this dashboard</h2>
        <p className="text-muted mt-2 text-sm leading-6">
          Being straight with you: these are planned, not built yet. Nothing here is being counted
          in the background.
        </p>
        <ul className="text-muted mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {[
            "Campus points and streaks",
            "The campus leaderboard",
            "Creator Pro unlock at point thresholds",
            "Downloadable campus asset pack",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="bg-muted/40 h-1.5 w-1.5 rounded-full" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function StatusPill({
  tone,
  label,
  pulse = false,
}: {
  tone: "emerald" | "amber" | "destructive";
  label: string;
  pulse?: boolean;
}) {
  const classes = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    destructive: "border-destructive/20 bg-destructive/10 text-destructive",
  }[tone];

  const dot = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    destructive: "bg-destructive",
  }[tone];

  return (
    <div className={`flex h-fit items-center gap-2 rounded-2xl border px-4 py-3 ${classes}`}>
      <div className={`h-2 w-2 rounded-full ${dot} ${pulse ? "animate-pulse" : ""}`} />
      <span className="text-xs font-bold tracking-wider uppercase">{label}</span>
    </div>
  );
}

function TimelineStep({
  icon: Icon,
  state,
  title,
  detail,
}: {
  icon: typeof Trophy;
  state: "done" | "current" | "upcoming" | "rejected";
  title: string;
  detail: string;
}) {
  const iconClasses = {
    done: "bg-emerald-500/10 text-emerald-500",
    current: "bg-amber-500/10 text-amber-500",
    upcoming: "bg-muted/10 text-muted",
    rejected: "bg-destructive/10 text-destructive",
  }[state];

  return (
    <li className="flex items-start gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClasses}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${state === "upcoming" ? "text-muted" : ""}`}>{title}</p>
        <p className="text-muted mt-0.5 text-xs leading-5">{detail}</p>
      </div>
    </li>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border bg-background rounded-xl border p-4">
      <p className="text-muted flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-6 wrap-break-word">{value}</p>
    </div>
  );
}
