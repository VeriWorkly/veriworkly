import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  LayoutTemplate,
  Search,
  Sparkles,
} from "lucide-react";

import { PortfolioPublicFooter } from "@/components/PortfolioPublicFooter";
import { PortfolioTemplatePreviewFrame } from "@/components/PortfolioTemplatePreviewFrame";
import { templates } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Portfolio Website Templates | VeriWorkly",
  description:
    "Preview VeriWorkly portfolio website templates for developers, designers, founders, and independent builders before creating your portfolio.",
};

const shell = "mx-auto w-[min(1280px,calc(100%_-_48px))] max-sm:w-[min(calc(100%_-_30px),1280px)]";
const action =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition duration-300 hover:-translate-y-1";

const sharedFeatures = [
  "One reusable portfolio content model",
  "Real live preview before choosing",
  "Responsive pages for desktop and mobile",
  "SEO title and social description support",
  "VeriWorkly subdomain publishing",
  "Private draft workflow before launch",
];

export default function PortfolioTemplatesPage() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f1efe7] font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] text-[#11110f]">
      <nav className={`${shell} flex min-h-[82px] items-center justify-between gap-4`}>
        <Link className="flex items-center gap-3 text-sm font-black tracking-[-.04em]" href="/">
          <Image src="/veriworkly-logo.png" width={28} height={28} alt="" />
          VeriWorkly Portfolio
        </Link>
        <div className="flex items-center gap-5 text-sm font-black">
          <Link className="hidden sm:inline" href="/pricing">
            Pricing
          </Link>
          <Link className="flex items-center gap-2" href="/">
            <ArrowLeft size={14} /> Landing
          </Link>
          <Link
            className="hidden min-h-10 items-center justify-center rounded-full bg-[#2563eb] px-4 text-xs font-black text-white sm:inline-flex"
            href="/dashboard"
          >
            Start building
          </Link>
        </div>
      </nav>

      <header className={`${shell} grid gap-10 pt-20 pb-16 lg:grid-cols-[1fr_24rem] lg:items-end`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-xs font-black text-white">
            <LayoutTemplate size={13} /> Live portfolio website templates
          </p>
          <h1 className="mt-7 max-w-6xl text-[clamp(3.8rem,8vw,7.5rem)] leading-[0.88] font-black tracking-[-0.08em] [overflow-wrap:normal]">
            Choose the site your work deserves.
          </h1>
        </div>
        <p className="border-t-2 border-[#11110f] pt-6 text-sm leading-7 text-[#11110f]/60">
          Each VeriWorkly template uses the same portfolio data, so Gautam Raj can fill content
          once, preview different directions, and switch the presentation without starting over.
        </p>
      </header>

      <section className={`${shell} grid gap-8 pb-24`}>
        {templates.map((template, index) => (
          <article
            className="grid gap-6 rounded-[2rem] border-2 border-[#11110f] bg-white/55 p-4 shadow-[14px_16px_0_rgba(37,99,235,0.12)] lg:grid-cols-[minmax(0,1fr)_24rem]"
            key={template.id}
          >
            <PortfolioTemplatePreviewFrame
              compact
              templateId={template.id}
              title={`${template.name} / ${template.mood}`}
            />
            <div className="flex flex-col p-3 lg:p-5">
              <span className="text-xs font-black text-[#2563eb]">0{index + 1}</span>
              <h2 className="mt-4 text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.86] font-black tracking-[-0.08em]">
                {template.name}
              </h2>
              <p className="mt-5 text-sm leading-7 text-[#11110f]/62">{template.note}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {template.strengths.map((strength) => (
                  <span
                    className="rounded-full border border-[#11110f]/15 bg-[#f1efe7] px-3 py-1.5 text-xs font-bold"
                    key={strength}
                  >
                    {strength}
                  </span>
                ))}
              </div>
              <div className="mt-auto grid gap-3 pt-8">
                <Link
                  className={`${action} bg-[#11110f] text-white`}
                  href={`/templates/${template.id}`}
                >
                  Review template details <ArrowRight size={15} />
                </Link>
                <a
                  className={`${action} border border-[#11110f]/15 bg-white text-[#11110f]`}
                  href={`/templates/${template.id}/preview`}
                >
                  Open full page preview <ExternalLink size={15} />
                </a>
                <Link className={`${action} bg-[#2563eb] text-white`} href="/dashboard">
                  Use this template <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="bg-[#11110f] py-24 text-white md:py-32">
        <div className={`${shell} grid gap-10 lg:grid-cols-[0.75fr_1.25fr]`}>
          <div>
            <p className="mb-5 text-[0.72rem] font-black tracking-[0.16em] text-[#93c5fd] uppercase">
              What every template shares
            </p>
            <h2 className="max-w-2xl text-[clamp(3rem,6vw,6rem)] leading-[0.88] font-black tracking-[-0.08em]">
              The design changes. The portfolio engine stays reliable.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sharedFeatures.map((feature) => (
              <div
                className="flex min-h-28 items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                key={feature}
              >
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#93c5fd]" />
                <span className="text-sm leading-6 font-black">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${shell} grid gap-4 py-24 lg:grid-cols-3`}>
        <article className="rounded-3xl border border-[#11110f]/15 bg-white p-6">
          <Sparkles className="size-5 text-[#2563eb]" />
          <h3 className="mt-8 text-3xl font-black tracking-[-0.06em]">For first impressions</h3>
          <p className="mt-4 text-sm leading-7 text-[#11110f]/60">
            Use Signal when the reader needs proof fast. Use Atelier when the story and voice need
            more space.
          </p>
        </article>
        <article className="rounded-3xl border border-[#11110f]/15 bg-white p-6">
          <Search className="size-5 text-[#2563eb]" />
          <h3 className="mt-8 text-3xl font-black tracking-[-0.06em]">For portfolio SEO</h3>
          <p className="mt-4 text-sm leading-7 text-[#11110f]/60">
            Every template is built around clear headings, linkable public routes, metadata, and
            crawlable content.
          </p>
        </article>
        <article className="rounded-3xl border border-[#11110f]/15 bg-white p-6">
          <LayoutTemplate className="size-5 text-[#2563eb]" />
          <h3 className="mt-8 text-3xl font-black tracking-[-0.06em]">For future switching</h3>
          <p className="mt-4 text-sm leading-7 text-[#11110f]/60">
            Your projects, bio, social links, services, and profile settings stay reusable across
            template directions.
          </p>
        </article>
      </section>

      <PortfolioPublicFooter />
    </main>
  );
}
