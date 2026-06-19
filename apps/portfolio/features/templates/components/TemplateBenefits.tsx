import React from "react";
import type { LucideIcon } from "lucide-react";
import { LayoutTemplate, Search, Sparkles } from "lucide-react";
import { templatesShell } from "../constants";

const benefits: Array<{ icon: LucideIcon; title: string; description: string; tag: string }> = [
  {
    icon: Sparkles,
    tag: "Visual Design",
    title: "Purpose-Built Aesthetics",
    description:
      "Choose styles that align with your industry. Use Signal's fast, high-density grid for engineering and technical work, or Atelier's warm editorial margins for visual storytelling and writing.",
  },
  {
    icon: Search,
    tag: "AEO & GEO Ready",
    title: "Structured Search Optimization",
    description:
      "Every template serves semantic HTML, optimized title/meta descriptions, and integrated JSON-LD schema markup to guarantee clean indexing and citation discovery by search engines and AI bots.",
  },
  {
    icon: LayoutTemplate,
    tag: "Zero Redundancy",
    title: "Seamless Content Portability",
    description:
      "Never build from scratch again. Your profile details, case studies, work history, services, and recommendations stay persistent and adapt instantly when switching between layouts.",
  },
];

const TemplateBenefits = () => {
  return (
    <section className="relative py-24">
      <div className="bg-accent/4 pointer-events-none absolute bottom-10 left-10 size-80 rounded-full blur-3xl" />

      <div className={`${templatesShell}`}>
        <div className="mb-14 max-w-3xl">
          <p className="border-line bg-panel/60 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase backdrop-blur">
            Why VeriWorkly
          </p>
          <h2 className="text-ink mt-6 text-[clamp(2.2rem,5vw,3.6rem)] leading-none font-bold tracking-tighter">
            Engineered for visibility, <br />
            designed for <span className="text-accent">distinction.</span>
          </h2>
          <p className="text-muted mt-5 max-w-2xl text-base leading-7">
            Traditional builders force you to sacrifice search engine discovery for layout
            customization. VeriWorkly portfolios combine semantic, AI-readable code architecture
            with high-fidelity, polished typography.
          </p>
        </div>

        <ul className="grid gap-6 lg:grid-cols-3" role="list">
          {benefits.map(({ icon: Icon, tag, title, description }) => (
            <li className="flex" key={title}>
              <article className="border-line bg-panel/30 hover:border-line-strong hover:bg-panel flex flex-col justify-between rounded-4xl border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-accent text-[10px] font-bold tracking-widest uppercase">
                      {tag}
                    </span>
                    <div className="border-line dark:bg-panel flex size-10 items-center justify-center rounded-full border bg-white/80 shadow-sm">
                      <Icon className="text-accent size-4.5" />
                    </div>
                  </div>
                  <h3 className="text-ink mt-8 text-2xl font-bold tracking-tight">{title}</h3>
                  <p className="text-muted mt-4 text-sm leading-6">{description}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default TemplateBenefits;
