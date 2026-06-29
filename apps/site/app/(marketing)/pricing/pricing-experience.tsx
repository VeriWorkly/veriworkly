"use client";

import { useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Crown,
  LoaderCircle,
  Minus,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";

import { siteConfig } from "@/config/site";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

type ProductKey = "ai_credits" | "portfolio_pro" | "bundle";
type BillingInterval = "one_day" | "seven_day" | "monthly" | "annual";

const comparisonRows = [
  ["Resume and cover letter editor", true, true, true, true],
  ["Private portfolio drafts", true, true, true, true],
  ["Public portfolio publishing", false, true, false, true],
  ["Custom subdomain and SEO controls", false, true, false, true],
  ["Portfolio analytics", false, true, false, true],
  ["AI writing credits", false, false, true, true],
  ["Watermark removal", false, true, false, true],
] as const;

const customPlans = {
  portfolio_pro: {
    eyebrow: "Publish and grow",
    title: "Creator Pro",
    price: "$9.99",
    description: "For builders who want a polished public portfolio without the AI bundle.",
    icon: Crown,
    features: ["Public subdomain", "Analytics & views", "SEO meta controls", "No watermark"],
  },
  ai_credits: {
    eyebrow: "Write with momentum",
    title: "AI Standalone",
    price: "$5.99",
    description: "For focused writing help across resumes, cover letters, and portfolio content.",
    icon: WandSparkles,
    features: [
      "1,000 monthly credits",
      "Tailor documents & bios",
      "ATS Score optimization",
      "Credits tracked clearly",
    ],
  },
} as const;

export function PricingExperience() {
  const [bundleInterval, setBundleInterval] = useState<"monthly" | "annual">("annual");
  const [customPlan, setCustomPlan] = useState<"portfolio_pro" | "ai_credits">("portfolio_pro");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ email?: string | null } | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    fetchApiData<{ email: string | null; name: string | null }>("/users/me")
      .then((data) => {
        setUser(data);
        setCheckingUser(false);
      })
      .catch(() => {
        setUser(null);
        setCheckingUser(false);
      });
  }, []);

  const isProd = process.env.NODE_ENV === "production";
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ashragautam25@gmail.com").toLowerCase();
  const isAdmin = user && user.email && user.email.toLowerCase() === adminEmail;
  const paymentsBlocked = isProd && !isAdmin;

  const checkout = async (productKey: ProductKey, interval: BillingInterval) => {
    if (paymentsBlocked) return;
    const checkoutKey = `${productKey}:${interval}`;
    setLoading(checkoutKey);
    setError("");

    try {
      const result = await fetchApiData<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ productKey, interval, redirectUrl: "/billing" }),
      });
      window.location.assign(result.url);
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        const params = new URLSearchParams({ productKey, interval });
        window.location.assign(`${siteConfig.links.app}/checkout?${params.toString()}`);
        return;
      }

      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setLoading("");
    }
  };

  const bundlePrice =
    bundleInterval === "annual"
      ? { amount: "$11.99", cadence: "/ month", note: "$143.88 billed yearly", savings: "Save 20%" }
      : {
          amount: "$14.99",
          cadence: "/ month",
          note: "Billed monthly",
          savings: "Recommended",
        };

  const selectedCustom = customPlans[customPlan];
  const CustomIcon = selectedCustom.icon;

  return (
    <main className="bg-background text-foreground overflow-hidden">
      {/* Hero Header */}
      <section className="border-border relative border-b pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-25" />
        <div className="bg-accent/12 pointer-events-none absolute top-20 -right-32 size-96 rounded-full blur-3xl" />

        <div className="relative mx-auto w-[min(1180px,calc(100%_-_32px))]">
          <div className="grid items-end gap-12 lg:grid-cols-[1.3fr_.7fr]">
            <div>
              <div className="border-border bg-card text-accent inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="size-3.5" /> Pay for the pace you need
              </div>
              <h1 className="mt-8 max-w-5xl text-[clamp(3.6rem,8vw,7.2rem)] leading-[0.88] font-bold tracking-tighter">
                One workspace.
                <span className="text-accent block">Your timeline.</span>
              </h1>
            </div>

            <div className="border-border border-t pt-6">
              <p className="text-muted max-w-md text-base leading-7">
                Get Creator Pro hosting and AI writing tools together for a weekend, a week, or a
                full year. Zero automatic renewal risk.
              </p>
              <div className="text-accent mt-6 flex items-center gap-3 text-xs font-bold uppercase">
                <ShieldCheck className="size-4" /> Secure checkout by Dodo Payments
              </div>
            </div>
          </div>

          {paymentsBlocked ? (
            <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm font-bold text-amber-800 dark:text-amber-300">
              Payments are disabled in production during this phase. Only system administrators can perform checkouts.
            </div>
          ) : null}

          {error ? (
            <p className="mt-8 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}

          {/* Primary Cards Grid */}
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: 3-Day Sprint */}
            <PriceCard
              marker="03"
              title="3-Day Sprint"
              price="$2.99"
              cadence="one-time purchase"
              description="A quick pass to publish your portfolio and tailor resumes for a specific application."
              features={[
                "Creator Pro subdomain hosting",
                "150 AI writing credits",
                "ATS document scanning",
                "Automatically expires",
              ]}
              loading={loading === "bundle:one_day"}
              disabled={paymentsBlocked}
              onCheckout={() => void checkout("bundle", "one_day")}
            />

            {/* Card 2: 7-Day Hunt */}
            <PriceCard
              marker="07"
              title="7-Day Hunt"
              price="$5.99"
              cadence="one-time purchase"
              description="Runway to update your story, apply broadly, and publish with full confidence."
              features={[
                "Creator Pro subdomain hosting",
                "400 AI writing credits",
                "ATS document scanning",
                "Automatically expires",
              ]}
              loading={loading === "bundle:seven_day"}
              disabled={paymentsBlocked}
              onCheckout={() => void checkout("bundle", "seven_day")}
            />

            {/* Card 3: Job Hunter Bundle */}
            <PriceCard
              featured
              marker="365"
              title="Job Hunter Bundle"
              price={bundlePrice.amount}
              cadence={bundlePrice.cadence}
              description="The complete workspace for active job searches, unlocking AI document tools."
              features={[
                "Creator Pro subdomain hosting",
                "1,000 monthly AI credits",
                "Full ATS Tailoring suite",
                "Cancel anytime",
              ]}
              note={bundlePrice.note}
              badge={bundlePrice.savings}
              loading={loading === `bundle:${bundleInterval}`}
              disabled={paymentsBlocked}
              onCheckout={() => void checkout("bundle", bundleInterval)}
              toggle={<IntervalToggle value={bundleInterval} onChange={setBundleInterval} />}
            />
          </div>
        </div>
      </section>

      {/* Ala Carte Section */}
      <section className="border-border border-b py-24 lg:py-32">
        <div className="mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <div className="border-border bg-card text-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
              <Zap className="size-3.5" /> Ala Carte
            </div>
            <h2 className="mt-5 text-[clamp(2.4rem,6vw,4rem)] leading-[0.92] font-bold tracking-tighter">
              Only need one superpower?
            </h2>
            <p className="text-muted mt-6 max-w-lg text-sm leading-7">
              Skip the bundle and choose the specific capability that unblocks you today. You can
              always upgrade or scale up later.
            </p>
          </div>

          <article className="border-border bg-card rounded-3xl border p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(customPlans) as Array<keyof typeof customPlans>).map((key) => (
                <button
                  className={`rounded-2xl px-5 py-4 text-left font-semibold transition ${
                    customPlan === key ? "bg-foreground text-background" : "hover:bg-muted"
                  }`}
                  key={key}
                  onClick={() => setCustomPlan(key)}
                  type="button"
                >
                  <span className="block text-[10px] font-bold tracking-wider uppercase opacity-65">
                    {customPlans[key].eyebrow}
                  </span>
                  <span className="mt-1 block text-lg font-bold tracking-tight">
                    {customPlans[key].title}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid gap-8 p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
              <div>
                <CustomIcon className="text-accent size-6" />
                <h3 className="mt-4 text-3xl font-bold tracking-tight">{selectedCustom.title}</h3>
                <p className="text-muted mt-3 max-w-sm text-sm leading-6">
                  {selectedCustom.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {selectedCustom.features.map((feature) => (
                    <span
                      className="border-border text-muted bg-background/50 rounded-full border px-3 py-1 text-xs font-semibold"
                      key={feature}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="min-w-[180px]">
                <p className="text-4xl font-bold tracking-tight">{selectedCustom.price}</p>
                <p className="text-muted mt-1 text-xs font-bold">per month</p>
                <CheckoutButton
                  className="bg-foreground text-background hover:bg-foreground/95 mt-6 w-full"
                  loading={loading === `${customPlan}:monthly`}
                  disabled={paymentsBlocked}
                  onClick={() => void checkout(customPlan, "monthly")}
                >
                  {paymentsBlocked ? "Payments disabled" : `Choose ${selectedCustom.title}`}
                </CheckoutButton>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="bg-card border-border border-b py-24 lg:py-32">
        <div className="mx-auto w-[min(1180px,calc(100%_-_32px))]">
          <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="text-accent text-xs font-bold tracking-wider uppercase">
                Compare access
              </p>
              <h2 className="mt-5 max-w-4xl text-[clamp(2.4rem,6vw,4rem)] leading-[0.9] font-bold tracking-tighter">
                Free stays useful. Paid gets powerful.
              </h2>
            </div>
            <p className="border-border text-muted border-t pt-5 text-base leading-7">
              Core resume and portfolio editors stay free forever. Upgrade when you need active
              subdomain hosting, custom SEO configurations, or advanced AI content tailoring.
            </p>
          </div>

          <div
            role="table"
            aria-label="Feature and plan comparison"
            className="border-border bg-background mt-14 overflow-x-auto rounded-3xl border"
          >
            <div className="min-w-[840px]">
              <div
                className="border-border bg-muted/30 text-muted grid grid-cols-[minmax(250px,1.2fr)_repeat(4,140px)] border-b px-6 py-5 text-xs font-bold tracking-wider uppercase"
                role="row"
              >
                <span role="columnheader">What&apos;s included</span>
                <span className="text-center" role="columnheader">
                  Free
                </span>
                <span className="text-center" role="columnheader">
                  Creator Pro
                </span>
                <span className="text-center" role="columnheader">
                  AI Standalone
                </span>
                <span className="text-accent text-center" role="columnheader">
                  Bundle
                </span>
              </div>

              {comparisonRows.map(([label, ...values]) => (
                <div
                  className="border-border hover:bg-muted/10 grid grid-cols-[minmax(250px,1.2fr)_repeat(4,140px)] items-center border-b px-6 py-4.5 text-sm transition-colors last:border-b-0"
                  key={label}
                  role="row"
                >
                  <span className="text-foreground/90 pr-4 font-medium">{label}</span>
                  {values.map((enabled, index) => (
                    <span className="grid place-items-center" key={`${label}-${index}`} role="cell">
                      {enabled ? (
                        <span
                          className={`inline-flex items-center justify-center rounded-full border p-1 transition-colors ${
                            index === 3
                              ? "bg-accent/15 border-accent/30 text-accent"
                              : "bg-foreground/5 border-foreground/10 text-foreground"
                          }`}
                        >
                          <CheckCircle2 className="size-3.5 shrink-0" />
                        </span>
                      ) : (
                        <span className="bg-muted/10 border-border text-muted/40 inline-flex items-center justify-center rounded-full border p-1">
                          <Minus className="size-3.5 shrink-0" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Table Bottom Banner */}
          <div className="bg-accent shadow-accent/25 mt-12 flex flex-col items-start justify-between gap-6 rounded-3xl p-8 text-white shadow-lg sm:flex-row sm:items-center lg:p-9">
            <div>
              <p className="text-xs font-bold tracking-wider text-white/95 uppercase">
                Best long-term value
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">
                A full year for $11.99 per month.
              </h3>
            </div>
            <CheckoutButton
              className="text-accent bg-white hover:bg-white/95"
              loading={loading === "bundle:annual"}
              disabled={paymentsBlocked}
              onClick={() => void checkout("bundle", "annual")}
            >
              {paymentsBlocked ? "Payments disabled" : "Get the yearly bundle"}
            </CheckoutButton>
          </div>
        </div>
      </section>
    </main>
  );
}

function IntervalToggle({
  value,
  onChange,
}: {
  value: "monthly" | "annual";
  onChange: (value: "monthly" | "annual") => void;
}) {
  return (
    <div className="border-border bg-background grid w-full grid-cols-2 rounded-full border p-1 text-xs font-bold">
      {(["annual", "monthly"] as const).map((interval) => (
        <button
          className={`rounded-full py-2.5 capitalize transition ${
            value === interval
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          }`}
          key={interval}
          onClick={() => onChange(interval)}
          type="button"
        >
          {interval === "annual" ? "Yearly (Save 20%)" : "Monthly"}
        </button>
      ))}
    </div>
  );
}

function PriceCard({
  marker,
  title,
  price,
  cadence,
  description,
  features,
  note,
  badge,
  featured,
  loading,
  toggle,
  onCheckout,
  disabled,
}: {
  marker: string;
  title: string;
  price: string;
  onCheckout: () => void;
  cadence: string;
  description: string;
  features: string[];
  note?: string;
  badge?: string;
  featured?: boolean;
  loading: boolean;
  toggle?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <article
      className={`relative flex min-h-[550px] flex-col rounded-3xl border-2 p-6 transition duration-300 hover:-translate-y-1 lg:p-7 ${
        featured
          ? "border-accent bg-accent text-accent-foreground shadow-accent/15 shadow-lg"
          : "border-border bg-card text-foreground shadow-sm"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute inset-0 z-0 rounded-[1.3rem] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_60%)]" />
      )}

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`font-mono text-xs font-bold ${featured ? "text-white/60" : "text-muted/50"}`}
          >
            {marker}
          </span>
          {badge ? (
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${
                featured
                  ? "text-accent animate-pulse bg-white"
                  : "bg-accent/10 border-accent/20 text-accent border"
              }`}
            >
              {badge}
            </span>
          ) : (
            <Clock3 className={`size-4 ${featured ? "text-white/60" : "text-muted/40"}`} />
          )}
        </div>

        <h2 className="mt-8 text-3xl font-bold tracking-tight">{title}</h2>

        <div className="mt-6">
          <p className="text-[clamp(3.2rem,5vw,4.8rem)] leading-none font-bold tracking-tighter">
            {price}
          </p>
          <p className="mt-2 text-xs font-bold opacity-75">{cadence}</p>
          {note ? <p className="mt-1 text-xs font-bold opacity-80">{note}</p> : null}
        </div>

        {toggle ? <div className="mt-5">{toggle}</div> : null}

        <p className="mt-6 text-sm leading-6 opacity-85">{description}</p>

        <ul className="mt-7 mb-8 space-y-3.5 text-xs font-bold">
          {features.map((feature) => (
            <li className="flex items-center gap-2" key={feature}>
              <Check className="size-3.5" /> {feature}
            </li>
          ))}
        </ul>

        <CheckoutButton
          className={`mt-auto w-full transition duration-200 active:scale-[0.97] ${
            featured
              ? "text-accent bg-white hover:bg-white/95"
              : "bg-foreground text-background hover:bg-foreground/95"
          }`}
          loading={loading}
          disabled={disabled}
          onClick={onCheckout}
        >
          {disabled ? "Payments disabled" : `Choose ${title}`}
        </CheckoutButton>
      </div>
    </article>
  );
}

function CheckoutButton({
  children,
  className,
  loading,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className: string;
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={loading || disabled}
      onClick={onClick}
      type="button"
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Coins className="size-4" />}
      {loading ? "Opening secure checkout" : children}
      {!loading ? <ArrowRight className="size-4" /> : null}
    </button>
  );
}
