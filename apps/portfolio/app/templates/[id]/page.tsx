import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  LayoutTemplate,
  Palette,
  Search,
  Type,
} from "lucide-react";

import { PortfolioPublicFooter } from "@/components/PortfolioPublicFooter";
import { PortfolioTemplatePreviewFrame } from "@/components/PortfolioTemplatePreviewFrame";
import { isTemplateId, templates, type TemplateId } from "@/templates/catalog/templates";

type PageProps = {
  params: Promise<{ id: string }>;
};

const shell = "mx-auto w-[min(1280px,calc(100%_-_48px))] max-sm:w-[min(calc(100%_-_30px),1280px)]";

const templateDetails: Record<
  TemplateId,
  {
    positioning: string;
    fonts: string;
    motion: string;
    palette: string;
    layout: string;
    componentLanguage: string;
    contentModel: string[];
    colorScheme: Array<{ name: string; value: string; className: string }>;
    bestFor: string[];
    designNotes: string[];
  }
> = {
  signal: {
    positioning: "A precise, proof-first portfolio for product engineers and technical builders.",
    fonts: "Tight geometric sans typography with oversized claims and compact evidence labels.",
    motion: "Scroll should feel direct: stacked proof, fast reveals, and minimal decorative delay.",
    palette: "Warm paper, sharp black, and VeriWorkly blue for credibility and action.",
    layout:
      "Dense editorial hero, compact evidence modules, crisp project cards, and short scanning paths.",
    componentLanguage:
      "Hard borders, browser chrome, evidence chips, metric cards, and direct call-to-action buttons.",
    contentModel: [
      "A strong one-line positioning statement",
      "Three to six outcome-led projects",
      "Technical credibility, skills, and systems thinking",
      "Contact and availability that are easy to find",
    ],
    colorScheme: [
      { name: "Paper", value: "#f1efe7", className: "bg-[#f1efe7]" },
      { name: "Ink", value: "#11110f", className: "bg-[#11110f]" },
      { name: "VeriWorkly blue", value: "#2563eb", className: "bg-[#2563eb]" },
      { name: "Panel", value: "#ffffff", className: "bg-white" },
    ],
    bestFor: ["Product engineers", "Founder-builders", "Technical consultants", "Product leaders"],
    designNotes: [
      "Large opening claim makes the builder's positioning impossible to miss.",
      "Project blocks prioritize outcomes, systems, and credibility before decoration.",
      "Compact navigation and evidence chips keep the page easy to scan.",
    ],
  },
  atelier: {
    positioning:
      "An editorial portfolio for designers, creative technologists, and independent makers.",
    fonts: "Expressive editorial scale with softer spacing and slower content rhythm.",
    motion:
      "Scroll can breathe: reveal writing, case studies, testimonials, and visual details gradually.",
    palette: "Warm canvas tones with VeriWorkly blue used as the brand anchor.",
    layout:
      "Spacious editorial hero, narrative case-study sections, softer cards, and longer reading rhythm.",
    componentLanguage:
      "Editorial panels, large typographic moments, warm spacing, softer dividers, and story-first CTAs.",
    contentModel: [
      "Personal point of view and creative positioning",
      "Case studies with process, context, and outcomes",
      "Testimonials, writing, and visual proof",
      "A contact section that feels like an invitation",
    ],
    colorScheme: [
      { name: "Canvas", value: "#f4eee4", className: "bg-[#f4eee4]" },
      { name: "Ink", value: "#11110f", className: "bg-[#11110f]" },
      { name: "VeriWorkly blue", value: "#2563eb", className: "bg-[#2563eb]" },
      { name: "Warm panel", value: "#fffaf1", className: "bg-[#fffaf1]" },
    ],
    bestFor: ["Designers", "Creative builders", "Independent studios", "Visual storytellers"],
    designNotes: [
      "Editorial pacing gives profile writing, process, and testimonials more room.",
      "Larger section breaks make visual work and personal voice feel intentional.",
      "The template works well when case studies need narrative depth.",
    ],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const template = templates.find((item) => item.id === id);

  if (!template) return { title: "Template Not Found" };

  return {
    title: `${template.name} Portfolio Template | VeriWorkly`,
    description: `${template.note} Preview the live ${template.name} portfolio template, design direction, SEO behavior, and best-fit use cases.`,
    robots: { index: true, follow: true },
  };
}

export function generateStaticParams() {
  return templates.map((template) => ({ id: template.id }));
}

export default async function PortfolioTemplateDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!isTemplateId(id)) notFound();

  const template = templates.find((item) => item.id === id);
  if (!template) notFound();

  const details = templateDetails[template.id];

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f1efe7] font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] text-[#11110f]">
      <nav className={`${shell} flex min-h-[82px] items-center justify-between gap-4`}>
        <Link className="flex items-center gap-3 text-sm font-black tracking-[-.04em]" href="/">
          <Image src="/veriworkly-logo.png" width={28} height={28} alt="" />
          VeriWorkly Portfolio
        </Link>
        <div className="flex items-center gap-4 text-sm font-black">
          <Link className="flex items-center gap-2" href="/templates">
            <ArrowLeft size={14} /> All templates
          </Link>
          <Link
            className="hidden min-h-10 items-center justify-center rounded-full bg-[#2563eb] px-4 text-xs font-black text-white sm:inline-flex"
            href="/dashboard"
          >
            Start building
          </Link>
        </div>
      </nav>

      <header className={`${shell} grid gap-10 pt-20 pb-14 lg:grid-cols-[1fr_26rem] lg:items-end`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-xs font-black text-white">
            <LayoutTemplate size={13} /> Live portfolio template
          </p>
          <h1 className="mt-7 max-w-6xl text-[clamp(3.8rem,8vw,7.5rem)] leading-[0.88] font-black tracking-[-0.08em] [overflow-wrap:normal]">
            {template.name} is built for {template.audience.toLowerCase()}.
          </h1>
        </div>
        <div className="border-t-2 border-[#11110f] pt-6">
          <p className="text-sm leading-7 text-[#11110f]/62">{details.positioning}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {template.strengths.map((strength) => (
              <span
                className="rounded-full border border-[#11110f]/15 bg-white px-3 py-1.5 text-xs font-bold"
                key={strength}
              >
                {strength}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className={`${shell} grid gap-8 pb-20 lg:grid-cols-[minmax(0,1fr)_22rem]`}>
        <PortfolioTemplatePreviewFrame
          interactive
          templateId={template.id}
          title={`${template.name} live preview`}
        />

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-3xl border-2 border-[#11110f] bg-white p-6 shadow-[10px_12px_0_rgba(37,99,235,0.14)]">
            <h2 className="text-2xl font-black tracking-[-0.05em]">Design brief</h2>
            <ul className="mt-6 space-y-4">
              {details.designNotes.map((note) => (
                <li className="flex gap-3 text-sm leading-6 text-[#11110f]/68" key={note}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2563eb]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#11110f] px-6 text-sm font-black text-white transition duration-300 hover:-translate-y-1"
            href={`/templates/${template.id}/preview`}
          >
            Full page review <ExternalLink size={15} />
          </a>
          <Link
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-6 text-sm font-black text-white transition duration-300 hover:-translate-y-1"
            href="/dashboard"
          >
            Use this template <ArrowRight size={15} />
          </Link>
        </aside>
      </section>

      <section className={`${shell} grid gap-4 pb-24 lg:grid-cols-3`}>
        <DetailCard icon={<Type className="size-5 text-[#2563eb]" />} title="Typography">
          {details.fonts}
        </DetailCard>
        <DetailCard icon={<Palette className="size-5 text-[#2563eb]" />} title="Visual system">
          {details.palette}
        </DetailCard>
        <DetailCard icon={<Search className="size-5 text-[#2563eb]" />} title="SEO structure">
          Clear headings, project sections, metadata controls, and a public preview path make this
          template easier to understand and share.
        </DetailCard>
      </section>

      <section className={`${shell} pb-24`}>
        <div className="rounded-[2rem] border-2 border-[#11110f] bg-white p-6 shadow-[14px_16px_0_rgba(37,99,235,0.12)] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-[#2563eb] uppercase">
                Template style guide
              </p>
              <h2 className="mt-4 max-w-xl text-[clamp(2.8rem,5vw,5.5rem)] leading-[0.88] font-black tracking-[-0.08em]">
                The design system behind {template.name}.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#11110f]/62">
                Use this guide to decide whether the template matches your work before you publish.
              </p>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-4">
                {details.colorScheme.map((color) => (
                  <div
                    className="overflow-hidden rounded-2xl border border-[#11110f]/15 bg-[#f1efe7]"
                    key={color.name}
                  >
                    <div className={`h-24 ${color.className}`} />
                    <div className="p-3">
                      <p className="text-xs font-black">{color.name}</p>
                      <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] text-[#11110f]/55">
                        {color.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <GuideBlock title="Layout rhythm">{details.layout}</GuideBlock>
                <GuideBlock title="Component language">{details.componentLanguage}</GuideBlock>
              </div>
              <div className="rounded-3xl border border-[#11110f]/15 bg-[#11110f] p-5 text-white">
                <h3 className="text-xl font-black tracking-[-0.04em]">Best content to prepare</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {details.contentModel.map((item) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 font-bold text-white/72"
                      key={item}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#11110f] py-24 text-white md:py-32">
        <div className={`${shell} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div>
            <p className="mb-5 text-[0.72rem] font-black tracking-[0.16em] text-[#93c5fd] uppercase">
              Best fit
            </p>
            <h2 className="max-w-2xl text-[clamp(3rem,6vw,6rem)] leading-[0.88] font-black tracking-[-0.08em]">
              Use {template.name} when the portfolio needs this kind of reader.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {details.bestFor.map((item) => (
              <div
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 font-black"
                key={item}
              >
                {item}
              </div>
            ))}
            <div className="rounded-3xl border border-[#2563eb] bg-[#2563eb] p-5 text-sm leading-6 font-black sm:col-span-2">
              Motion direction: {details.motion}
            </div>
          </div>
        </div>
      </section>

      <section className={`${shell} py-24`}>
        <div className="grid gap-8 rounded-[2rem] border-2 border-[#11110f] bg-white p-8 shadow-[14px_16px_0_rgba(37,99,235,0.12)] lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-[#2563eb] uppercase">
              Ready to build
            </p>
            <h2 className="mt-4 max-w-3xl text-[clamp(2.5rem,5vw,5rem)] leading-[0.88] font-black tracking-[-0.08em]">
              Start with {template.name}, then switch anytime.
            </h2>
          </div>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2563eb] px-6 text-sm font-black text-white transition duration-300 hover:-translate-y-1"
            href="/dashboard"
          >
            Create my portfolio <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <PortfolioPublicFooter />
    </main>
  );
}

function GuideBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-3xl border border-[#11110f]/15 bg-[#f1efe7] p-5">
      <h3 className="text-xl font-black tracking-[-0.04em]">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-[#11110f]/62">{children}</p>
    </article>
  );
}

function DetailCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-[#11110f]/15 bg-white p-6">
      {icon}
      <h3 className="mt-8 text-3xl font-black tracking-[-0.06em]">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-[#11110f]/60">{children}</p>
    </article>
  );
}
