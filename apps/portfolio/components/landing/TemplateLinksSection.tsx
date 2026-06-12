import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { PortfolioTemplatePreviewFrame } from "@/components/PortfolioTemplatePreviewFrame";

import { templates } from "@/lib/portfolio";

const action =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition duration-300 hover:-translate-y-1";

const TemplateLinksSection = () => {
  return (
    <section className="bg-accent py-32 text-white md:py-48" id="templates">
      <div className="mx-auto grid w-[min(1360px,calc(100%-48px))] items-start gap-[7vw] max-sm:w-[min(calc(100%-30px),1360px)] lg:grid-cols-[0.75fr_1.25fr]">
        <div className="top-27.5 rounded-4xl border border-white/20 bg-white/10 p-6 backdrop-blur lg:sticky">
          <p className="mb-5 text-[0.72rem] font-black tracking-[0.16em] uppercase">
            Live template links
          </p>

          <h2 className="max-w-xl text-[clamp(3rem,6vw,6.2rem)] leading-[0.9] tracking-tighter wrap-normal">
            Switch templates without starting over.
          </h2>

          <p className="mt-6 max-w-md text-sm leading-7 text-white/72">
            Open the live previews, compare the feeling, then start building with the same
            structured portfolio content.
          </p>

          <div className="mt-7 grid gap-2">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/templates/${template.id}`}
                className="group flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black transition hover:bg-white hover:text-[#11110f]"
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
              data-stack-card
              key={template.id}
              style={{ top: `${110 + index * 22}px` }}
              className="group sticky top-27.5 overflow-hidden rounded-3xl bg-transparent pr-4 text-[#11110f]"
            >
              <PortfolioTemplatePreviewFrame
                compact
                image={true}
                href={template.image}
                templateId={template.id}
                title={`${template.name} / ${template.mood}`}
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/templates/${template.id}/preview`}
                  className={`${action} min-h-11 bg-[#11110f] text-white`}
                >
                  Full page review <ExternalLink size={15} aria-hidden="true" />
                </Link>

                <Link
                  href={`/templates/${template.id}`}
                  className={`${action} min-h-11 border border-white/35 bg-white text-[#11110f]`}
                >
                  Template details <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TemplateLinksSection;
