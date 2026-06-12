import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { PortfolioTemplatePreviewFrame } from "@/components/PortfolioTemplatePreviewFrame";
import type { TemplateSummary } from "@/templates/catalog/templates";

import { templateAction, templatesShell } from "../constants";

export function TemplateCatalog({ templates }: { templates: TemplateSummary[] }) {
  return (
    <section className={`${templatesShell} grid gap-8 pb-24`}>
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
            <span className="text-accent text-xs font-black">0{index + 1}</span>
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
                className={`${templateAction} bg-[#11110f] text-white`}
                href={`/templates/${template.id}`}
              >
                Review template details <ArrowRight size={15} />
              </Link>
              <a
                className={`${templateAction} border border-[#11110f]/15 bg-white text-[#11110f]`}
                href={`/templates/${template.id}/preview`}
              >
                Open full page preview <ExternalLink size={15} />
              </a>
              <Link className={`${templateAction} bg-accent text-white`} href="/dashboard">
                Use this template <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
