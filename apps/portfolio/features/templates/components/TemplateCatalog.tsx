import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import type { TemplateSummary } from "@/templates/catalog/templates";

import { PortfolioTemplatePreviewFrame } from "@/components/PortfolioTemplatePreviewFrame";

import { templateAction, templatesShell } from "../constants";

const TemplateCatalog = ({ templates }: { templates: TemplateSummary[] }) => {
  return (
    <section className={`${templatesShell} grid gap-8 pb-24`}>
      {templates.map((template, index) => (
        <article
          className="border-ink-2 grid gap-6 rounded-4xl border-2 bg-white/55 p-4 shadow-[14px_16px_0_rgba(37,99,235,0.12)] lg:grid-cols-[minmax(0,1fr)_24rem]"
          key={template.id}
        >
          <PortfolioTemplatePreviewFrame
            compact
            image={true}
            href={template.image}
            templateId={template.id}
            title={`${template.name} / ${template.mood}`}
          />

          <div className="flex flex-col p-3 lg:p-5">
            <span className="text-accent text-xs font-bold">0{index + 1}</span>

            <h2 className="mt-4 text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.86] font-bold tracking-[-0.08em]">
              {template.name}
            </h2>

            <p className="text-ink-2/62 mt-5 text-sm leading-7">{template.note}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {template.strengths.map((strength) => (
                <span
                  className="border-ink-2/15 bg-paper rounded-full border px-3 py-1.5 text-xs font-bold"
                  key={strength}
                >
                  {strength}
                </span>
              ))}
            </div>

            <div className="mt-auto grid gap-3 pt-8">
              <Link
                href={`/templates/${template.id}`}
                className={`${templateAction} bg-ink-2 text-white`}
              >
                Review template details <ArrowRight size={15} />
              </Link>

              <Link
                href={`/templates/${template.id}/preview`}
                className={`${templateAction} border-ink-2/15 text-ink-2 border bg-white`}
              >
                Open full page preview <ExternalLink size={15} />
              </Link>

              <Link className={`${templateAction} bg-accent text-white`} href="/dashboard">
                Use this template <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
};

export default TemplateCatalog;
