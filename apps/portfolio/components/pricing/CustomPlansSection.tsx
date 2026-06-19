"use client";

import { useState } from "react";
import { Crown, WandSparkles } from "lucide-react";

import { siteConfig } from "@/config/site";

import { CheckoutButton } from "@/features/pricing/components/CheckoutButton";

const customPlans = {
  portfolio_pro: {
    icon: Crown,
    price: "$8.99",
    title: "Portfolio Pro",
    eyebrow: "Publish and grow",
    description: "For builders who want a polished public portfolio without the AI bundle.",
    features: ["Public portfolio", "Analytics", "SEO controls", "No watermark"],
  },

  ai_credits: {
    price: "$4.99",
    icon: WandSparkles,
    title: "AI Credits",
    eyebrow: "Write with momentum",
    description: "For focused writing help across resumes, cover letters, and portfolio content.",
    features: [
      "1,000 monthly credits",
      "Review-first drafts",
      "Resume and portfolio AI",
      "Credits tracked clearly",
    ],
  },
} as const;

const CustomPlansSection = () => {
  const [customPlan, setCustomPlan] = useState<"portfolio_pro" | "ai_credits">("portfolio_pro");

  const selectedCustom = customPlans[customPlan];
  const CustomIcon = selectedCustom.icon;

  return (
    <section className="relative py-24 lg:py-32">
      <div className="bg-accent/5 pointer-events-none absolute top-40 -right-32 size-96 rounded-full blur-3xl" />
      <div className="mx-auto grid w-[min(1160px,calc(100%-32px))] gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
        <div>
          <p className="text-accent text-xs font-bold tracking-[0.16em] uppercase">
            Build your own plan
          </p>

          <h2 className="text-ink mt-5 text-[clamp(2.4rem,6vw,4rem)] leading-none font-bold tracking-tighter">
            Only need one superpower?
          </h2>

          <p className="text-ink/75 mt-6 max-w-lg text-base leading-7">
            Skip the bundle and choose the product that removes today&apos;s bottleneck. You can
            upgrade later without rebuilding your work.
          </p>
        </div>

        <article className="border-line bg-panel rounded-[2.2rem] border-2 p-3.5 shadow-[0_20px_50px_rgba(17,17,15,0.04)] transition-all duration-300 hover:shadow-[0_24px_58px_rgba(17,17,15,0.06)]">
          <div className="relative grid grid-cols-2 rounded-[1.4rem] bg-black/5 p-1 dark:bg-white/5">
            <div
              className="bg-ink absolute top-1 bottom-1 rounded-2xl transition-all duration-300 ease-out"
              style={{
                left: customPlan === "portfolio_pro" ? "4px" : "calc(50% + 2px)",
                width: "calc(50% - 6px)",
              }}
            />

            <button
              type="button"
              onClick={() => setCustomPlan("portfolio_pro")}
              className={`relative z-10 cursor-pointer rounded-[1.2rem] px-5 py-4 text-left transition duration-250 ${
                customPlan === "portfolio_pro"
                  ? "text-paper font-bold"
                  : "text-ink/60 hover:text-accent font-bold"
              }`}
            >
              <span className="block text-[10px] font-bold tracking-[0.12em] uppercase opacity-75">
                Publish and grow
              </span>

              <span className="mt-1 block text-base tracking-[-0.03em] sm:text-lg">
                Portfolio Pro
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCustomPlan("ai_credits")}
              className={`relative z-10 cursor-pointer rounded-[1.2rem] px-5 py-4 text-left transition duration-250 ${
                customPlan === "ai_credits"
                  ? "text-paper font-bold"
                  : "text-ink/60 hover:text-accent font-bold"
              }`}
            >
              <span className="block text-[10px] font-bold tracking-[0.12em] uppercase opacity-75">
                Write with momentum
              </span>

              <span className="mt-1 block text-base tracking-[-0.03em] sm:text-lg">AI Credits</span>
            </button>
          </div>

          <div className="grid gap-8 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
            <div>
              <div className="flex items-center gap-3">
                <CustomIcon className="text-accent size-6 animate-pulse" />
                <span className="bg-accent/10 border-accent/10 text-accent rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase">
                  Individual Add-on
                </span>
              </div>

              <h3 className="text-ink mt-6 text-3xl font-bold tracking-tighter sm:text-4xl">
                {selectedCustom.title}
              </h3>

              <p className="text-ink/75 mt-3 max-w-md text-base leading-7">
                {selectedCustom.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {selectedCustom.features.map((feature) => (
                  <span
                    className="border-line bg-paper/40 text-ink rounded-full border px-3.5 py-1.5 text-xs font-bold"
                    key={feature}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-line/10 min-w-48 border-t pt-6 sm:border-t-0 sm:pt-0">
              <p className="text-ink text-5xl font-bold tracking-[-0.06em]">
                {selectedCustom.price}
              </p>

              <p className="text-muted mt-1 text-xs font-bold">per month</p>

              <CheckoutButton
                href={`${siteConfig.links.app}/checkout?productKey=${customPlan}&interval=monthly`}
                className="bg-accent hover:bg-accent-strong mt-5 w-full text-white shadow-[0_10px_20px_rgba(37,99,235,0.15)]"
              >
                Choose {selectedCustom.title}
              </CheckoutButton>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default CustomPlansSection;
