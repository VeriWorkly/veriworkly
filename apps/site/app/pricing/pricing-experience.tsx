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
} from "lucide-react";

import { siteConfig } from "@/config/site";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

type ProductKey = "ai_credits" | "portfolio_pro" | "bundle";
type BillingInterval = "one_day" | "seven_day" | "monthly" | "annual";

const primaryFeatures = [
  "Portfolio Pro publishing",
  "AI writing credits",
  "ATS and document tools",
  "No long-term lock-in",
];

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
    title: "Portfolio Pro",
    price: "$8.99",
    description: "For builders who want a polished public portfolio without the AI bundle.",
    icon: Crown,
    features: ["Public portfolio", "Analytics", "SEO controls", "No watermark"],
  },
  ai_credits: {
    eyebrow: "Write with momentum",
    title: "AI Credits",
    price: "$4.99",
    description: "For focused writing help across resumes, cover letters, and portfolio content.",
    icon: WandSparkles,
    features: [
      "1000 monthly credits",
      "Review-first drafts",
      "Resume and portfolio AI",
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
      ? { amount: "$9.99", cadence: "/ month", note: "$120 billed yearly", savings: "Save $23.88" }
      : {
          amount: "$11.99",
          cadence: "/ month",
          note: "Billed monthly",
          savings: "Flexible monthly",
        };

  const selectedCustom = customPlans[customPlan];
  const CustomIcon = selectedCustom.icon;

  return (
    <main className="overflow-hidden bg-[#f6f3eb] text-[#171713] dark:bg-[#10110f] dark:text-[#f7f4ec]">
      <section className="relative border-b border-black/10 pt-28 pb-20 lg:pt-36 lg:pb-28 dark:border-white/10">
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(#171713_0.7px,transparent_0.7px)] [background-size:18px_18px] opacity-35 dark:opacity-10" />
        <div className="pointer-events-none absolute top-20 -right-32 size-96 rounded-full bg-[#f5be42]/25 blur-3xl" />
        <div className="relative mx-auto w-[min(1180px,calc(100%_-_32px))]">
          <div className="grid items-end gap-12 lg:grid-cols-[1.35fr_.65fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/65 px-4 py-2 text-xs font-black tracking-[0.12em] uppercase backdrop-blur dark:border-white/15 dark:bg-white/5">
                <Sparkles className="size-3.5 text-[#db8b00]" /> Pay for the pace you need
              </p>
              <h1 className="mt-8 max-w-5xl text-[clamp(4.2rem,10vw,8.6rem)] leading-[0.83] font-black tracking-[-0.09em]">
                One toolkit.
                <span className="block text-[#d88700]">Your timeline.</span>
              </h1>
            </div>
            <div className="border-t-2 border-current pt-6">
              <p className="max-w-md text-base leading-7 opacity-65">
                Get Portfolio Pro and AI credits together for a day, a week, or a full year. No
                oversized commitment before the work earns it.
              </p>
              <div className="mt-6 flex items-center gap-3 text-xs font-black uppercase">
                <ShieldCheck className="size-4 text-[#d88700]" /> Secure checkout by Dodo Payments
              </div>
            </div>
          </div>

          {paymentsBlocked ? (
            <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm font-bold text-amber-800 dark:text-amber-300">
              Payments are disabled in production during this phase. Only system administrators can perform checkouts.
            </div>
          ) : null}

          {error ? (
            <p className="mt-8 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="mt-16 grid gap-4 lg:grid-cols-[.8fr_.9fr_1.25fr]">
            <PriceCard
              marker="01"
              title="Day Pass"
              price="$0.69"
              cadence="for 24 hours"
              description="A tiny commitment for one focused application, portfolio update, or deadline."
              features={primaryFeatures}
              loading={loading === "bundle:one_day"}
              disabled={paymentsBlocked}
              onCheckout={() => void checkout("bundle", "one_day")}
            />
            <PriceCard
              marker="07"
              title="Week Sprint"
              price="$3.99"
              cadence="for 7 days"
              description="Enough runway to refine the full story, apply broadly, and publish with confidence."
              features={primaryFeatures}
              loading={loading === "bundle:seven_day"}
              disabled={paymentsBlocked}
              onCheckout={() => void checkout("bundle", "seven_day")}
            />
            <PriceCard
              featured
              marker="365"
              title="Full Bundle"
              price={bundlePrice.amount}
              cadence={bundlePrice.cadence}
              description="The complete VeriWorkly workspace for consistent career momentum all year."
              features={primaryFeatures}
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

      <section className="py-24 lg:py-32">
        <div className="mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-[#d88700] uppercase">
              Build your own plan
            </p>
            <h2 className="mt-5 text-[clamp(3.2rem,7vw,6.8rem)] leading-[0.88] font-black tracking-[-0.08em]">
              Only need one superpower?
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-7 opacity-60">
              Skip the bundle and choose the product that removes today&apos;s bottleneck. You can
              upgrade later without rebuilding your work.
            </p>
          </div>

          <article className="rounded-[2rem] border-2 border-current bg-white p-3 shadow-[14px_16px_0_#f5be42] dark:bg-[#171815]">
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(customPlans) as Array<keyof typeof customPlans>).map((key) => (
                <button
                  className={`rounded-2xl px-5 py-4 text-left transition ${
                    customPlan === key
                      ? "bg-[#171713] text-white dark:bg-[#f7f4ec] dark:text-[#171713]"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  key={key}
                  onClick={() => setCustomPlan(key)}
                  type="button"
                >
                  <span className="text-xs font-black tracking-[0.12em] uppercase opacity-55">
                    {customPlans[key].eyebrow}
                  </span>
                  <span className="mt-1 block text-xl font-black tracking-[-0.04em]">
                    {customPlans[key].title}
                  </span>
                </button>
              ))}
            </div>
            <div className="grid gap-8 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
              <div>
                <CustomIcon className="size-6 text-[#d88700]" />
                <h3 className="mt-6 text-4xl font-black tracking-[-0.06em]">
                  {selectedCustom.title}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-7 opacity-60">
                  {selectedCustom.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {selectedCustom.features.map((feature) => (
                    <span
                      className="rounded-full border border-current/15 px-3 py-1.5 text-xs font-bold"
                      key={feature}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <div className="min-w-48">
                <p className="text-5xl font-black tracking-[-0.07em]">{selectedCustom.price}</p>
                <p className="mt-1 text-xs font-bold opacity-50">per month</p>
                <CheckoutButton
                  className="mt-5 w-full bg-[#171713] text-white dark:bg-[#f7f4ec] dark:text-[#171713]"
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

      <section className="bg-[#171713] py-24 text-white lg:py-32">
        <div className="mx-auto w-[min(1180px,calc(100%_-_32px))]">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_.65fr]">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-[#f5be42] uppercase">
                Compare access
              </p>
              <h2 className="mt-5 max-w-4xl text-[clamp(3.4rem,7vw,7rem)] leading-[0.86] font-black tracking-[-0.08em]">
                Free stays useful. Paid gets powerful.
              </h2>
            </div>
            <p className="border-t border-white/30 pt-5 text-sm leading-7 text-white/55">
              Core document building remains free. Upgrade when you need publishing, focused AI
              assistance, or both.
            </p>
          </div>

          <div className="mt-14 overflow-x-auto rounded-3xl border border-white/15">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[minmax(250px,1fr)_repeat(4,130px)] bg-white/[0.06] px-5 py-5 text-xs font-black tracking-[0.1em] uppercase">
                <span>What&apos;s included</span>
                <span className="text-center">Free</span>
                <span className="text-center">Portfolio</span>
                <span className="text-center">AI credits</span>
                <span className="text-center text-[#f5be42]">Bundle</span>
              </div>
              {comparisonRows.map(([label, ...values]) => (
                <div
                  className="grid grid-cols-[minmax(250px,1fr)_repeat(4,130px)] items-center border-t border-white/10 px-5 py-4 text-sm"
                  key={label}
                >
                  <span className="font-bold">{label}</span>
                  {values.map((enabled, index) => (
                    <span className="grid place-items-center" key={`${label}-${index}`}>
                      {enabled ? (
                        <CheckCircle2 className={`size-4 ${index === 3 ? "text-[#f5be42]" : ""}`} />
                      ) : (
                        <Minus className="size-4 text-white/20" />
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#f5be42] p-7 text-[#171713] sm:flex-row sm:items-center lg:p-9">
            <div>
              <p className="text-xs font-black tracking-[0.14em] uppercase">Best long-term value</p>
              <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                A full year for $9.99 per month.
              </h3>
            </div>
            <CheckoutButton
              className="bg-[#171713] text-white"
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
    <div className="grid grid-cols-2 rounded-full bg-black/10 p-1 text-xs font-black dark:bg-white/10">
      {(["annual", "monthly"] as const).map((interval) => (
        <button
          className={`rounded-full px-4 py-2.5 capitalize transition ${
            value === interval ? "bg-[#171713] text-white dark:bg-white dark:text-[#171713]" : ""
          }`}
          key={interval}
          onClick={() => onChange(interval)}
          type="button"
        >
          {interval}
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
  cadence: string;
  description: string;
  features: string[];
  note?: string;
  badge?: string;
  featured?: boolean;
  loading: boolean;
  toggle?: React.ReactNode;
  onCheckout: () => void;
  disabled?: boolean;
}) {
  return (
    <article
      className={`relative flex min-h-[540px] flex-col rounded-[2rem] border-2 p-6 transition duration-300 hover:-translate-y-1 lg:p-7 ${
        featured
          ? "border-[#171713] bg-[#f5be42] text-[#171713] shadow-[14px_16px_0_rgba(23,23,19,.16)]"
          : "border-black/15 bg-white/75 shadow-[8px_10px_0_rgba(23,23,19,.05)] dark:border-white/15 dark:bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-black opacity-45">{marker}</span>
        {badge ? (
          <span className="rounded-full bg-[#171713] px-3 py-1.5 text-[0.65rem] font-black text-white uppercase">
            {badge}
          </span>
        ) : (
          <Clock3 className="size-4 opacity-40" />
        )}
      </div>
      <h2 className="mt-8 text-3xl font-black tracking-[-0.06em]">{title}</h2>
      <div className="mt-6">
        <p className="text-[clamp(3.5rem,5vw,5.2rem)] leading-none font-black tracking-[-0.08em]">
          {price}
        </p>
        <p className="mt-2 text-xs font-black opacity-50">{cadence}</p>
        {note ? <p className="mt-1 text-xs font-bold opacity-60">{note}</p> : null}
      </div>
      {toggle ? <div className="mt-5">{toggle}</div> : null}
      <p className="mt-6 text-sm leading-6 opacity-65">{description}</p>
      <ul className="mt-7 space-y-3 text-xs font-bold">
        {features.map((feature) => (
          <li className="flex items-center gap-2" key={feature}>
            <Check className="size-3.5" /> {feature}
          </li>
        ))}
      </ul>
      <CheckoutButton
        className={`mt-auto w-full ${
          featured
            ? "bg-[#171713] text-white"
            : "bg-[#171713] text-white dark:bg-[#f7f4ec] dark:text-[#171713]"
        }`}
        loading={loading}
        disabled={disabled}
        onClick={onCheckout}
      >
        {disabled ? "Payments disabled" : `Choose ${title}`}
      </CheckoutButton>
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
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
