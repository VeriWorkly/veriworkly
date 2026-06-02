"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { backendApiUrl } from "@/lib/backend";

type BillingSummary = {
  plan: string;
  status: string;
  interval: "MONTHLY" | "ANNUAL" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceEndsAt: string | null;
  canPublish: boolean;
};

const benefits = [
  "One published VeriWorkly subdomain",
  "Privacy-first portfolio view analytics",
  "Unlimited draft edits and private previews",
  "Both production portfolio templates",
];

export function BillingWorkspace() {
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const loadBilling = useCallback(async () => {
    setLoading("/billing/me");
    setMessage("");
    try {
      const response = await fetch(backendApiUrl("/billing/me"), { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Could not load billing status.");
      setBilling(payload.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load billing status.");
    } finally {
      setLoading("");
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadBilling(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBilling]);

  const open = async (path: string, body?: object) => {
    setLoading(path);
    setMessage("");
    try {
      const response = await fetch(backendApiUrl(path), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Billing request failed.");
      window.location.assign(payload.data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Billing request failed.");
      setLoading("");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between px-5">
          <Link className="inline-flex items-center gap-2 text-sm font-extrabold" href="/dashboard">
            <ArrowLeft size={15} /> Portfolio studio
          </Link>
          <span className="text-xs font-bold text-[var(--color-muted)]">Secure billing</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-16 max-sm:py-10">
        <section className="grid grid-cols-[minmax(0,1fr)_300px] items-end gap-10 border-b border-[var(--color-line)] pb-12 max-[780px]:grid-cols-1">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.14em] text-[var(--color-accent)] uppercase">
              <Sparkles size={14} /> Portfolio Pro
            </p>
            <h1 className="mt-5 max-w-3xl text-[clamp(3.4rem,7vw,6.2rem)] leading-[.94] font-semibold tracking-[-.1em]">
              Publish the portfolio you are proud to send.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
              Drafts and private previews stay free. Upgrade only when your site is ready for the
              world.
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-ink)] p-5 text-[var(--color-panel)]">
            <ShieldCheck size={20} />
            <p className="mt-4 text-sm font-extrabold">No pressure to publish early.</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-panel)]/70">
              Build privately for as long as you need. Your draft remains editable on either plan.
            </p>
          </div>
        </section>

        {message ? (
          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-sm font-bold"
            role="alert"
          >
            <p>{message}</p>
            {!billing ? (
              <button className="text-[var(--color-accent)]" onClick={() => void loadBilling()}>
                Try again
              </button>
            ) : null}
          </div>
        ) : null}

        <section className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 py-10 max-[860px]:grid-cols-1">
          <div>
            <p className="text-xs font-extrabold tracking-[.12em] text-[var(--color-muted)] uppercase">
              Included with Pro
            </p>
            <ul className="mt-5 space-y-4">
              {benefits.map((benefit) => (
                <li className="flex gap-3 text-sm font-bold" key={benefit}>
                  <Check className="mt-0.5 shrink-0 text-[var(--color-accent)]" size={16} />
                  {benefit}
                </li>
              ))}
            </ul>
            {billing ? (
              <article className="mt-9 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
                <p className="text-xs font-extrabold tracking-[.12em] text-[var(--color-muted)] uppercase">
                  Current access
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-extrabold">
                    {billing.plan === "PORTFOLIO_PRO" ? "Portfolio Pro" : "Free drafts"}{" "}
                    <span className="text-sm text-[var(--color-muted)]">· {billing.status}</span>
                  </p>
                  {billing.plan === "PORTFOLIO_PRO" ? (
                    <button
                      className="inline-flex items-center gap-2 text-sm font-extrabold whitespace-nowrap text-[var(--color-accent)]"
                      onClick={() => void open("/billing/portal")}
                    >
                      Manage billing <ExternalLink size={14} />
                    </button>
                  ) : null}
                </div>
                {billing.currentPeriodEnd ? (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {billing.cancelAtPeriodEnd ? "Access ends" : "Renews"}{" "}
                    {new Date(billing.currentPeriodEnd).toLocaleDateString()}.
                  </p>
                ) : null}
                {billing.graceEndsAt ? (
                  <p className="mt-2 text-sm font-bold text-[var(--color-danger)]">
                    Payment recovery grace period ends{" "}
                    {new Date(billing.graceEndsAt).toLocaleDateString()}.
                  </p>
                ) : null}
              </article>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Plan
              title="Monthly"
              price="$12"
              suffix="/ month"
              copy="Flexible billing for a portfolio you can pause or change later."
              onClick={() => void open("/billing/checkout", { interval: "monthly" })}
              loading={loading === "/billing/checkout"}
              disabled={loading !== ""}
            />
            <Plan
              featured
              title="Annual"
              price="$120"
              suffix="/ year"
              copy="The same full access with two months effectively included."
              note="Save $24 each year"
              onClick={() => void open("/billing/checkout", { interval: "annual" })}
              loading={loading === "/billing/checkout"}
              disabled={loading !== ""}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Plan({
  title,
  price,
  suffix,
  copy,
  note,
  featured,
  onClick,
  loading,
  disabled,
}: {
  title: string;
  price: string;
  suffix: string;
  copy: string;
  note?: string;
  featured?: boolean;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <article
      className={`flex min-h-[350px] flex-col rounded-[var(--radius-lg)] border p-5 ${featured ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-line)] bg-[var(--color-panel)]"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold">{title}</p>
        {featured ? (
          <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-extrabold tracking-[.08em] text-[var(--color-accent-ink)] uppercase">
            Best value
          </span>
        ) : null}
      </div>
      <p className="mt-8 text-5xl font-extrabold tracking-[-.1em]">
        {price}
        <span className="ml-1 text-sm tracking-normal text-[var(--color-muted)]">{suffix}</span>
      </p>
      <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">{copy}</p>
      <p className="mt-3 text-xs font-extrabold text-[var(--color-accent)]">
        {note ?? "Cancel when you need to"}
      </p>
      <button
        className={`mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold whitespace-nowrap transition ${featured ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-strong)]" : "bg-[var(--color-ink)] text-[var(--color-panel)]"}`}
        onClick={onClick}
        disabled={disabled}
      >
        {loading ? <LoaderCircle className="animate-spin" size={15} /> : null} Choose{" "}
        {title.toLowerCase()}
      </button>
    </article>
  );
}
