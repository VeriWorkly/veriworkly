import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  Check,
  Minus,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Portfolio Builder Pricing | VeriWorkly",
  description:
    "Build a VeriWorkly portfolio for free, preview templates, and upgrade when you are ready to publish with a subdomain, SEO metadata, analytics, and hosted media.",
};

const shell = "mx-auto w-[min(1280px,calc(100%_-_48px))] max-sm:w-[min(calc(100%_-_30px),1280px)]";
const actionClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition duration-300 hover:-translate-y-1";

const features = [
  ["Complete editor and private previews", true, true],
  ["Signal and Atelier live templates", true, true],
  ["One-time content updates across templates", true, true],
  ["Public VeriWorkly subdomain", false, true],
  ["Views and referrer analytics", false, true],
  ["Meta title and social sharing controls", false, true],
  ["Hosted portfolio images", false, true],
  ["No ads or watermark", false, true],
] as const;

const faqs = [
  {
    question: "Can I build before paying?",
    answer:
      "Yes. You can create a private draft, fill your content, and preview live templates before upgrading.",
  },
  {
    question: "What changes when I switch templates?",
    answer:
      "Only the presentation changes. Your projects, bio, links, services, SEO fields, and publishing settings stay reusable.",
  },
  {
    question: "Who is Portfolio Pro for?",
    answer:
      "Pro is for builders who want a public VeriWorkly subdomain, better sharing controls, analytics, hosted media, and no watermark.",
  },
];

export default function PricingPage() {
  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "VeriWorkly Portfolio Pro",
    description:
      "Publish a professional portfolio website on a custom VeriWorkly subdomain with SEO metadata, image hosting, and page views analytics.",
    brand: {
      "@type": "Brand",
      name: "VeriWorkly",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "12",
      offerCount: "2",
      offers: [
        {
          "@type": "Offer",
          name: "Draft",
          price: "0",
          priceCurrency: "USD",
          url: `${siteConfig.url}/pricing`,
        },
        {
          "@type": "Offer",
          name: "Portfolio Pro",
          price: "12",
          priceCurrency: "USD",
          url: `${siteConfig.url}/pricing`,
        },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main className="min-h-dvh overflow-x-hidden bg-[#f1efe7] font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] text-[#11110f]">
        <nav className={`${shell} flex min-h-20.5 items-center justify-between gap-4`}>
          <Link className="flex items-center gap-3 text-sm font-black tracking-[-.04em]" href="/">
            <Image src="/veriworkly-logo.png" width={28} height={28} alt="VeriWorkly Logo" />
            VeriWorkly Portfolio
          </Link>

          <div className="flex items-center gap-5 text-sm font-black">
            <Link className="hidden sm:inline" href="/templates">
              Templates
            </Link>

            <Link className="flex items-center gap-2" href="/">
              <ArrowLeft size={14} /> Landing
            </Link>

            <Link
              href="/dashboard"
              className="bg-accent hidden min-h-10 items-center justify-center rounded-full px-4 text-xs font-black text-white sm:inline-flex"
            >
              Start building
            </Link>
          </div>
        </nav>

        <header
          className={`${shell} grid gap-10 pt-20 pb-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end`}
        >
          <div>
            <p className="bg-accent inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black text-white">
              <Sparkles size={13} /> Draft for free. Publish when ready.
            </p>
            <h1 className="mt-7 max-w-6xl text-[clamp(3.8rem,8vw,7.5rem)] leading-[0.88] font-black tracking-[-0.08em] wrap-normal">
              Pricing for a portfolio that keeps working.
            </h1>
          </div>
          <p className="border-t-2 border-[#11110f] pt-6 text-sm leading-7 text-[#11110f]/60">
            Build privately, test live templates, and only pay when the site needs a public
            subdomain, metadata controls, image hosting, and analytics.
          </p>
        </header>

        <section
          className={`${shell} grid gap-4 pb-16 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]`}
        >
          <Plan
            title="Draft"
            price="$0"
            note="Forever, no card required"
            href="/dashboard"
            actionLabel="Start a private draft"
          >
            Write, arrange, preview Signal and Atelier, and refine the portfolio until the story is
            ready.
          </Plan>
          <Plan
            featured
            title="Portfolio Pro"
            price="$12"
            suffix="monthly"
            note="Or $120 yearly"
            href="/billing"
            actionLabel="Publish with Pro"
          >
            Publish with a VeriWorkly subdomain, tune sharing metadata, host images, and see what
            gets attention.
          </Plan>
        </section>

        <section className={`${shell} pb-20`}>
          <div className="overflow-hidden rounded-3xl border-2 border-[#11110f] bg-white shadow-[12px_14px_0_rgba(37,99,235,0.18)]">
            <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] bg-[#11110f] px-4 py-4 text-xs font-black text-white sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
              <span>What you get</span>
              <span className="text-center">Draft</span>
              <span className="text-center">Pro</span>
            </div>
            {features.map(([label, free, pro]) => (
              <div
                className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center border-b border-[#11110f]/12 px-4 py-4 text-sm last:border-0 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]"
                key={label}
              >
                <span className="font-bold">{label}</span>
                <Feature enabled={free} />
                <Feature enabled={pro} />
              </div>
            ))}
          </div>
        </section>

        <section className={`${shell} grid gap-4 pb-24 lg:grid-cols-3`}>
          <article className="rounded-3xl border border-[#11110f]/15 bg-white p-6">
            <WandSparkles className="text-accent size-5" />
            <h2 className="mt-8 text-3xl font-black tracking-[-0.06em]">
              Upgrade when the draft works
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#11110f]/60">
              Keep the free plan while you are still shaping the story. Pro starts to matter when
              you want the portfolio public and shareable.
            </p>
          </article>
          <article className="rounded-3xl border border-[#11110f]/15 bg-white p-6">
            <ShieldCheck className="text-accent size-5" />
            <h2 className="mt-8 text-3xl font-black tracking-[-0.06em]">Own the public presence</h2>
            <p className="mt-4 text-sm leading-7 text-[#11110f]/60">
              Pro adds the subdomain, metadata, analytics, image hosting, and clean public delivery
              that a professional portfolio needs.
            </p>
          </article>
          <article className="bg-accent rounded-3xl border border-[#11110f]/15 p-6 text-white">
            <Sparkles className="size-5" />
            <h2 className="mt-8 text-3xl font-black tracking-[-0.06em]">
              Built for template switching
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/72">
              Your content remains the source of truth, so pricing is tied to publishing power
              rather than template access.
            </p>
          </article>
        </section>

        <section className="bg-[#11110f] py-24 text-white md:py-32">
          <div className={`${shell} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
            <div>
              <p className="mb-5 text-[0.72rem] font-black tracking-[0.16em] text-[#93c5fd] uppercase">
                Pricing questions
              </p>
              <h2 className="max-w-2xl text-[clamp(3rem,6vw,6rem)] leading-[0.88] font-black tracking-[-0.08em]">
                Start free. Pay when the portfolio needs to be public.
              </h2>
            </div>
            <div className="grid gap-3">
              {faqs.map((faq) => (
                <article
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
                  key={faq.question}
                >
                  <h3 className="text-xl font-black tracking-[-0.04em]">{faq.question}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/58">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <PortfolioPublicFooter />
      </main>
    </>
  );
}

function Plan({
  title,
  price,
  suffix,
  note,
  href,
  actionLabel,
  featured,
  children,
}: {
  title: string;
  price: string;
  suffix?: string;
  note: string;
  href: string;
  actionLabel: string;
  featured?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={`flex min-h-[430px] flex-col rounded-3xl border-2 p-7 shadow-[12px_14px_0_rgba(17,17,15,0.08)] sm:p-8 ${
        featured
          ? "bg-accent border-[#11110f] text-white"
          : "border-[#11110f]/15 bg-white text-[#11110f]"
      }`}
    >
      <p className="text-sm font-black">{title}</p>
      <p className="mt-10 text-7xl font-black tracking-[-.06em]">{price}</p>
      <p className="mt-2 text-xs font-bold opacity-70">
        {suffix} {note}
      </p>
      <p className="mt-7 max-w-md text-sm leading-7 opacity-75">{children}</p>
      <Link
        className={`${actionClass} mt-auto ${
          featured ? "bg-white text-[#11110f]" : "bg-[#11110f] text-white"
        }`}
        href={href}
      >
        {actionLabel}
        <ArrowRight size={15} />
      </Link>
    </article>
  );
}

function Feature({ enabled }: { enabled: boolean }) {
  return (
    <span className="grid place-items-center text-[#11110f]/45">
      {enabled ? <Check size={15} className="text-accent" /> : <Minus size={14} />}
    </span>
  );
}
