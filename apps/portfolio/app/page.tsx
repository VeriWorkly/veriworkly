import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  Globe2,
  LayoutTemplate,
  MousePointer2,
  PencilLine,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { LandingMotion } from "@/components/LandingMotion";
import { PortfolioPublicFooter } from "@/components/PortfolioPublicFooter";
import { PortfolioTemplatePreviewFrame } from "@/components/PortfolioTemplatePreviewFrame";
import { templates } from "@/lib/portfolio";

const action =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition duration-300 hover:-translate-y-1";
const shell = "mx-auto w-[min(1360px,calc(100%_-_48px))] max-sm:w-[min(calc(100%_-_30px),1360px)]";
const eyebrow = "mb-5 text-[0.72rem] font-black uppercase tracking-[0.16em]";
const hugeTitle =
  "max-w-6xl text-[clamp(3.6rem,8vw,8.2rem)] leading-[0.87] tracking-[-0.08em] [overflow-wrap:normal]";
const sectionTitle =
  "max-w-4xl text-[clamp(3.4rem,7vw,7rem)] leading-[0.88] tracking-[-0.075em] [overflow-wrap:normal]";

const steps = [
  {
    number: "01",
    title: "Fill one focused form",
    copy: "Add work, links, services, experience, testimonials, SEO, and publishing details from one calm workspace.",
    icon: PencilLine,
  },
  {
    number: "02",
    title: "Preview real templates",
    copy: "Check the live template before committing. Your content stays intact while the presentation changes.",
    icon: LayoutTemplate,
  },
  {
    number: "03",
    title: "Publish with confidence",
    copy: "Launch on a VeriWorkly subdomain, update metadata, and keep refining whenever your work evolves.",
    icon: Globe2,
  },
];

const capabilities = [
  "Gautam Raj portfolio demo",
  "Custom meta title",
  "VeriWorkly subdomain",
  "Live template previews",
  "One-time content updates",
  "Template switching",
  "Project sections",
  "Privacy-first analytics",
];

const proofPoints = [
  "Fill profile content once",
  "Switch visual templates anytime",
  "Publish on a VeriWorkly subdomain",
  "Control SEO title and description",
  "Preview real templates before choosing",
  "Keep private drafts while editing",
];

const seoTopics = [
  {
    title: "Portfolio website builder for developers",
    copy: "Show projects, systems, technical decisions, links, and credibility in a site that reads faster than a resume.",
  },
  {
    title: "Online portfolio for designers and builders",
    copy: "Turn services, case studies, testimonials, screenshots, and experiments into a polished public profile.",
  },
  {
    title: "Professional portfolio with SEO controls",
    copy: "Update the page title, social description, public URL, and template presentation as your work evolves.",
  },
];

export default function HomePage() {
  return (
    <LandingMotion>
      <main className="w-full max-w-full overflow-x-hidden bg-[#f1efe7] font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] text-[#11110f]">
        <div
          data-scroll-progress
          className="fixed inset-x-0 top-0 z-[100] h-[3px] origin-left scale-x-0 bg-[#2563eb]"
        />

        <nav className="fixed top-[18px] left-1/2 z-[90] flex min-h-[62px] w-[min(1160px,calc(100%_-_32px))] -translate-x-1/2 items-center justify-between gap-5 rounded-full border border-[#11110f]/12 bg-[#f7f5ee]/80 py-2 pr-2.5 pl-4 shadow-[0_14px_45px_rgba(17,17,15,0.08)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-black tracking-[-.04em]">
            <Image src="/veriworkly-logo.png" width={28} height={28} alt="" priority />
            VeriWorkly
          </Link>
          <div className="hidden items-center gap-7 text-xs font-black md:flex">
            <a href="/templates">Templates</a>
            <Link href="/pricing">Pricing</Link>
          </div>
          <Link className={`${action} min-h-10 bg-[#11110f] px-5 text-white`} href="/dashboard">
            Start building <ArrowRight size={15} />
          </Link>
        </nav>

        <section
          data-spotlight
          className="relative flex min-h-svh flex-col items-center overflow-hidden bg-[radial-gradient(circle_at_var(--pointer-x,78%)_var(--pointer-y,18%),rgba(37,99,235,0.24),transparent_31%),radial-gradient(circle_at_10%_70%,rgba(255,255,255,0.82),transparent_28%),#f1efe7] px-6 pt-[150px] pb-20 max-sm:px-4"
        >
          <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(#11110f_0.7px,transparent_0.7px)] [mask-image:linear-gradient(to_bottom,black,transparent_75%)] [background-size:7px_7px] opacity-[0.18]" />
          <div className="absolute top-[-30vw] left-[-15vw] h-[54vw] w-[54vw] rounded-full border border-[#11110f]/10" />
          <div className="absolute top-[15vw] right-[-33vw] h-[45vw] w-[45vw] rounded-full border border-[#11110f]/10" />

          <div className="relative z-[2] mb-14 w-[min(1220px,100%)] text-center" data-reveal>
            <p className={eyebrow}>VeriWorkly portfolio builder by Gautam Raj</p>
            <h1 className={`${hugeTitle} mx-auto`}>
              One form. A portfolio that feels{" "}
              <span className="relative inline-block h-[clamp(2.5rem,5.8vw,5.5rem)] w-[clamp(5.5rem,10vw,9rem)] rotate-[-4deg] overflow-hidden rounded-full border-[3px] border-[#11110f] bg-[#2563eb] align-[0.05em] max-sm:hidden">
                <span className="absolute inset-[18%_12%] rotate-12 border-y-[3px] border-[#f8fbff]" />
              </span>{" "}
              unmistakably yours.
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-[clamp(1rem,1.5vw,1.2rem)] leading-8 text-[#11110f]/62">
              Turn scattered work into a sharp portfolio in minutes. Update once, switch templates
              freely, publish on a subdomain, and control how your site appears in search and
              social.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                className={`${action} bg-[#2563eb] text-white shadow-[0_5px_0_#11110f]`}
                href="/dashboard"
              >
                Build my portfolio <ArrowRight size={16} />
              </Link>
              <a
                className={`${action} border border-[#11110f]/20 bg-white/65 text-[#11110f]`}
                href="#templates"
              >
                Check live templates <ArrowDownRight size={16} />
              </a>
            </div>
          </div>

          <div
            data-hero-stage
            data-tilt
            data-tilt-base="rotate(-2deg)"
            className="relative z-[3] mx-auto w-[min(1080px,84vw)] rotate-[-2deg] transition-transform duration-300 max-lg:w-[92vw]"
          >
            <div className="overflow-hidden rounded-3xl border-[5px] border-[#11110f] bg-white shadow-[25px_30px_0_rgba(17,17,15,0.13)] max-sm:rounded-2xl max-sm:border-[3px]">
              <div className="flex h-[46px] items-center justify-between gap-4 border-b-2 border-[#11110f] px-4 text-[10px] font-black">
                <span className="flex gap-1.5">
                  <i className="size-2 rounded-full border border-[#11110f]" />
                  <i className="size-2 rounded-full border border-[#11110f]" />
                  <i className="size-2 rounded-full border border-[#11110f]" />
                </span>
                <span className="rounded-full bg-[#efeee8] px-6 py-1.5 max-sm:hidden">
                  gautam.veriworkly.com
                </span>
                <span className="size-2 rounded-full bg-[#2563eb]" />
              </div>
              <div className="relative h-[540px] overflow-hidden bg-[#e9e8e1] p-8 max-lg:h-[420px] max-lg:p-5 max-sm:h-[370px]">
                <div className="flex items-center justify-between text-[10px] font-black tracking-[0.16em] text-[#11110f]/55 uppercase">
                  <span>Builder console</span>
                  <span className="rounded-full bg-white px-3 py-1">Live draft</span>
                </div>
                <div className="mt-12 grid gap-8 max-lg:mt-8 lg:grid-cols-[1.02fr_0.98fr]">
                  <div>
                    <span className="inline-flex rounded-full bg-[#2563eb] px-4 py-2 text-[10px] font-black tracking-[0.14em] text-white uppercase">
                      Gautam Raj profile
                    </span>
                    <h2 className="mt-6 max-w-xl text-[clamp(2.7rem,5.8vw,5.8rem)] leading-[0.84] font-black tracking-[-0.085em]">
                      Generate a site from one clean source.
                    </h2>
                    <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
                      {["Projects", "SEO title", "Subdomain"].map((item, index) => (
                        <div
                          className="rounded-2xl border border-[#11110f]/15 bg-white/72 p-4 text-left shadow-[6px_7px_0_rgba(17,17,15,0.08)]"
                          key={item}
                        >
                          <span className="text-[10px] font-black text-[#2563eb]">
                            0{index + 1}
                          </span>
                          <b className="mt-8 block text-sm tracking-[-0.04em]">{item}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative min-h-[330px] overflow-hidden rounded-[2.2rem] border-2 border-[#11110f] bg-[#2563eb] p-5 text-white shadow-[12px_14px_0_rgba(17,17,15,0.16)] max-lg:hidden">
                    <div className="absolute right-[-60px] bottom-[-70px] size-64 rounded-full bg-white/18" />
                    <div className="relative z-[2] rounded-3xl bg-white p-5 text-[#11110f]">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase">
                        <span>VeriWorkly</span>
                        <span>Signal</span>
                      </div>
                      <h3 className="mt-10 text-5xl leading-[0.88] font-black tracking-[-0.08em]">
                        Gautam Raj builds proof, clarity, and systems.
                      </h3>
                      <p className="mt-5 max-w-sm text-xs leading-6 text-[#11110f]/60">
                        One update moves through projects, services, links, metadata, and every
                        template.
                      </p>
                    </div>
                    <div className="relative z-[2] mt-4 grid grid-cols-2 gap-3">
                      <span className="rounded-2xl bg-[#11110f] p-4 text-xs font-black">
                        gautam.veriworkly.com
                      </span>
                      <span className="rounded-2xl bg-white/15 p-4 text-xs font-black">
                        Meta preview ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              data-parallax="0.08"
              className="absolute top-[26%] left-[-8%] flex items-center gap-2.5 rounded-2xl border-2 border-[#11110f] bg-white px-3.5 py-3 text-[10px] shadow-[7px_7px_0_#11110f] max-lg:hidden"
            >
              <WandSparkles size={17} />
              <span>
                <b className="block text-[11px]">Template changed</b>Content stayed in place
              </span>
            </div>
            <div
              data-parallax="-0.07"
              className="absolute right-[-7%] bottom-[25%] flex items-center gap-2.5 rounded-2xl border-2 border-[#11110f] bg-white px-3.5 py-3 text-[10px] shadow-[7px_7px_0_#11110f] max-lg:hidden"
            >
              <span className="size-[7px] rounded-full bg-[#50d672] shadow-[0_0_0_4px_rgba(80,214,114,0.18)]" />
              <span>
                <b className="block text-[11px]">Published</b>gautam.veriworkly.com
              </span>
            </div>
          </div>
        </section>

        <section
          className="scale-[1.01] -rotate-1 overflow-hidden border-y-2 border-[#11110f] bg-[#2563eb] py-4 text-white"
          aria-label="Portfolio features"
        >
          <div data-marquee className="flex w-max gap-5 will-change-transform">
            {[...capabilities, ...capabilities, ...capabilities].map((item, index) => (
              <span
                className="flex items-center gap-5 pr-4 text-sm font-black whitespace-nowrap"
                key={`${item}-${index}`}
              >
                <i className="size-1.5 rounded-full bg-white" />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className={`${shell} py-32 md:py-48`} id="how-it-works">
          <div className="mb-18 grid items-end gap-8 lg:grid-cols-[1fr_1.2fr_0.8fr]" data-reveal>
            <p className={eyebrow}>The shortest path from work to website</p>
            <h2 className={sectionTitle}>Build it once. Keep it alive.</h2>
            <p className="max-w-sm text-sm leading-7 text-[#11110f]/58">
              Your content is the source of truth. Templates are different lenses for the same
              proof.
            </p>
          </div>
          <div className="grid border-t-2 border-[#11110f] lg:grid-cols-3">
            {steps.map(({ number, title, copy, icon: Icon }) => (
              <article
                className="group flex min-h-[410px] flex-col justify-between border-[#11110f]/20 p-6 transition-colors duration-500 hover:bg-[#2563eb] hover:text-white max-lg:min-h-[310px] max-lg:border-b lg:border-r lg:last:border-r-0"
                data-reveal
                key={number}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">{number}</span>
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="max-w-xs text-3xl leading-none font-black tracking-[-0.055em]">
                    {title}
                  </h3>
                  <p className="mt-4 max-w-xs text-sm leading-7 text-[#11110f]/58 group-hover:text-white/70">
                    {copy}
                  </p>
                </div>
                <ChevronRight size={20} />
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#11110f] py-32 text-[#f4f2e9] md:py-48">
          <div className={shell}>
            <div className="mb-18 grid items-end gap-8 lg:grid-cols-[0.65fr_1.35fr]" data-reveal>
              <p className={eyebrow}>Everything required. Nothing to maintain.</p>
              <h2 className={sectionTitle}>Your professional presence, already handled.</h2>
            </div>
            <div className="grid grid-flow-dense auto-rows-[430px] grid-cols-12 gap-3 max-lg:auto-rows-auto max-lg:grid-cols-1">
              <article
                className="relative col-span-7 flex overflow-hidden rounded-3xl border border-white/15 bg-[#191916] p-8 transition duration-500 hover:-translate-y-1.5 hover:border-[#2563eb] max-lg:col-auto max-lg:min-h-[430px]"
                data-reveal
              >
                <div className="flex items-start gap-4">
                  <PencilLine size={20} />
                  <div>
                    <h3 className="max-w-xl text-[clamp(1.7rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.055em]">
                      A form that thinks like an editor
                    </h3>
                    <p className="mt-3 text-xs leading-7 text-white/50">
                      Only the questions that sharpen Gautam&apos;s story and VeriWorkly&apos;s
                      product proof.
                    </p>
                  </div>
                </div>
                <div className="absolute right-8 bottom-[-65px] left-[10%] rotate-[-2deg] rounded-t-2xl bg-[#f4f2e9] p-6 text-[#11110f] max-sm:right-6 max-sm:left-6">
                  <label className="mb-2 flex justify-between text-[9px] font-black uppercase">
                    Headline <span>64 / 80</span>
                  </label>
                  <div className="rounded-lg border border-[#11110f]/15 p-3 text-xs">
                    Building VeriWorkly into a product ecosystem.
                  </div>
                  <label className="mt-4 mb-2 flex justify-between text-[9px] font-black uppercase">
                    Featured product
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-[#11110f]/15 p-3 text-xs">
                    <span className="h-6 w-8 rounded bg-[#2563eb]" />
                    <b>Portfolio Builder</b>
                    <Check size={15} className="ml-auto" />
                  </div>
                  <span className="absolute right-[18%] bottom-[11%] grid size-8 place-items-center rounded-full bg-[#2563eb] text-white">
                    <MousePointer2 size={15} />
                  </span>
                </div>
              </article>
              <article
                className="relative col-span-5 flex flex-col justify-between overflow-hidden rounded-3xl border border-[#2563eb]/25 bg-[#2563eb] p-8 text-white transition duration-500 hover:-translate-y-1.5 max-lg:col-auto max-lg:min-h-[430px]"
                data-reveal
              >
                <div className="self-end rounded-full border border-white/25 p-6">
                  <Globe2 size={88} strokeWidth={1} />
                </div>
                <div>
                  <h3 className="text-[clamp(1.7rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.055em]">
                    A subdomain with your name on it
                  </h3>
                  <p className="mt-3 text-xs leading-7 text-white/70">
                    Claim a clean address the moment you publish.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-2 text-[10px] font-black">
                    <span className="size-[7px] rounded-full bg-[#50d672]" />
                    gautam.veriworkly.com
                  </div>
                </div>
              </article>
              <article
                className="col-span-5 flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-[#191916] p-8 transition duration-500 hover:-translate-y-1.5 hover:border-[#2563eb] max-lg:col-auto max-lg:min-h-[430px]"
                data-reveal
              >
                <div>
                  <Search size={20} />
                  <h3 className="mt-3 text-[clamp(1.7rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.055em]">
                    Control how the world sees you
                  </h3>
                  <p className="mt-3 text-xs leading-7 text-white/50">
                    Set the title and description that appear on search, social, and link previews.
                  </p>
                </div>
                <div className="rotate-2 rounded-2xl bg-white p-5 text-[#11110f]">
                  <span className="text-[10px] text-[#237b38]">gautam.veriworkly.com</span>
                  <b className="mt-2 block text-base text-[#2563eb]">
                    Gautam Raj - Builder of VeriWorkly
                  </b>
                  <p className="mt-1 text-xs leading-6 text-[#11110f]/60">
                    Portfolio builder, resume tools, publishing workflows, and product experiments.
                  </p>
                </div>
              </article>
              <article
                className="col-span-7 flex items-end gap-3 overflow-hidden rounded-3xl border border-white/15 bg-[#191916] p-8 transition duration-500 hover:-translate-y-1.5 hover:border-[#2563eb] max-lg:col-auto max-lg:min-h-[520px] max-sm:flex-wrap"
                data-reveal
              >
                <div className="w-[35%] self-start max-sm:w-full">
                  <Sparkles size={20} />
                  <h3 className="mt-3 text-[clamp(1.7rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.055em]">
                    Change the mood, not the content
                  </h3>
                  <p className="mt-3 text-xs leading-7 text-white/50">
                    Move from technical Signal to editorial Atelier without rebuilding.
                  </p>
                </div>
                <div className="flex h-3/4 w-[27%] rotate-[-3deg] flex-col justify-between rounded-2xl bg-[#f2efe5] p-5 text-[#11110f] transition duration-500 hover:-translate-y-3 max-sm:h-64 max-sm:w-[calc(50%-0.5rem)]">
                  <span className="text-[9px] font-black uppercase">Signal</span>
                  <strong className="text-6xl tracking-[-0.08em]">Aa</strong>
                </div>
                <div className="flex h-3/4 w-[27%] rotate-3 flex-col justify-between rounded-2xl bg-[#2563eb] p-5 text-white transition duration-500 hover:-translate-y-3 max-sm:h-64 max-sm:w-[calc(50%-0.5rem)]">
                  <span className="text-[9px] font-black uppercase">Atelier</span>
                  <strong className="text-6xl tracking-[-0.08em]">Aa</strong>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-[#2563eb] py-32 text-white md:py-48" id="templates">
          <div className={`${shell} grid items-start gap-[7vw] lg:grid-cols-[0.75fr_1.25fr]`}>
            <div className="top-[110px] rounded-[2rem] border border-white/20 bg-white/10 p-6 backdrop-blur lg:sticky">
              <p className={eyebrow}>Live template links</p>
              <h2 className="max-w-xl text-[clamp(3rem,6vw,6.2rem)] leading-[0.88] tracking-[-0.075em] [overflow-wrap:normal]">
                Switch templates without starting over.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-white/72">
                Open the live previews, compare the feeling, then start building with the same
                structured portfolio content.
              </p>
              <div className="mt-7 grid gap-2">
                {templates.map((template) => (
                  <Link
                    className="group flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black transition hover:bg-white hover:text-[#11110f]"
                    href={`/templates/${template.id}`}
                    key={template.id}
                  >
                    {template.name}
                    <span className="text-xs font-bold opacity-65">{template.mood}</span>
                  </Link>
                ))}
              </div>
              <Link className={`${action} mt-8 bg-white text-[#11110f]`} href="/templates">
                Browse all templates <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-24 max-lg:pt-12">
              {templates.map((template, index) => (
                <article
                  className="group sticky top-[110px] overflow-hidden rounded-3xl bg-transparent text-[#11110f]"
                  data-stack-card
                  key={template.id}
                  style={{ top: `${110 + index * 22}px` }}
                >
                  <PortfolioTemplatePreviewFrame
                    compact
                    templateId={template.id}
                    title={`${template.name} / ${template.mood}`}
                  />
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      className={`${action} min-h-11 bg-[#11110f] text-white`}
                      href={`/templates/${template.id}/preview`}
                    >
                      Full page review <ExternalLink size={15} />
                    </a>
                    <Link
                      className={`${action} min-h-11 border border-white/35 bg-white text-[#11110f]`}
                      href={`/templates/${template.id}`}
                    >
                      Template details <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${shell} grid gap-12 py-32 md:py-44 lg:grid-cols-[0.82fr_1.18fr]`}>
          <div className="lg:sticky lg:top-[120px] lg:self-start" data-reveal>
            <p className={eyebrow}>Built for search and humans</p>
            <h2 className={sectionTitle}>More than a pretty portfolio page.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#11110f]/60">
              VeriWorkly Portfolio gives your work a public home with enough structure for search
              engines and enough personality for real people.
            </p>
          </div>
          <div className="grid gap-4">
            {seoTopics.map((topic, index) => (
              <article
                className="rounded-[2rem] border border-[#11110f]/15 bg-white/72 p-7 shadow-[10px_12px_0_rgba(37,99,235,0.08)]"
                data-reveal
                key={topic.title}
              >
                <span className="text-xs font-black text-[#2563eb]">0{index + 1}</span>
                <h3 className="mt-4 text-[clamp(2rem,4vw,4rem)] leading-[0.92] font-black tracking-[-0.07em]">
                  {topic.title}
                </h3>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#11110f]/62">{topic.copy}</p>
              </article>
            ))}
            <div className="grid gap-3 sm:grid-cols-2" data-reveal>
              {proofPoints.map((point) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-[#11110f]/12 bg-[#11110f] px-4 py-4 text-sm font-black text-white"
                  key={point}
                >
                  <Check className="size-4 text-[#93c5fd]" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 md:py-36">
          <div className={shell}>
            <div
              className="relative grid min-h-[680px] place-content-center overflow-hidden rounded-[28px] bg-[#11110f] px-8 py-16 text-center text-white"
              data-reveal
            >
              <div
                data-parallax="-0.05"
                data-parallax-base="translate(-50%, -50%)"
                className="absolute top-1/2 left-1/2 h-[42vw] w-[42vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563eb] opacity-25 blur-[100px]"
              />
              <p className={`${eyebrow} relative z-[2] text-[#93c5fd]`}>
                You already did the work.
              </p>
              <h2 className="relative z-[2] mx-auto max-w-5xl text-[clamp(4rem,9vw,9rem)] leading-[0.84] tracking-[-0.085em] [overflow-wrap:normal]">
                Now make it impossible to overlook.
              </h2>
              <p className="relative z-[2] mx-auto mt-6 max-w-lg text-sm leading-7 text-white/58">
                Start with a private draft. Publish when the story, metadata, and template feel
                unmistakably VeriWorkly.
              </p>
              <div className="relative z-[2] mt-9 flex flex-wrap justify-center gap-3">
                <Link className={`${action} bg-[#2563eb] text-white`} href="/dashboard">
                  Create my portfolio <ArrowRight size={16} />
                </Link>
                <Link
                  className={`${action} border border-white/25 bg-white/10 text-white`}
                  href="/pricing"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        <PortfolioPublicFooter />
      </main>
    </LandingMotion>
  );
}
