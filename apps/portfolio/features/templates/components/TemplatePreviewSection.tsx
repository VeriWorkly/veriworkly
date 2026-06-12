import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

import { PortfolioTemplatePreviewFrame } from "@/components/PortfolioTemplatePreviewFrame";
import type { TemplateSummary } from "@/templates/catalog/templates";

import { templatesShell } from "../constants";
import type { TemplateDetails } from "../data/template-details";

export function TemplatePreviewSection({
  template,
  details,
}: {
  template: TemplateSummary;
  details: TemplateDetails;
}) {
  return (
    <section className={`${templatesShell} grid gap-8 pb-20 lg:grid-cols-[minmax(0,1fr)_22rem]`}>
      <PortfolioTemplatePreviewFrame
        interactive
        templateId={template.id}
        title={`${template.name} live preview`}
      />
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-3xl border-2 border-[#11110f] bg-white p-6 shadow-[10px_12px_0_rgba(37,99,235,0.14)]">
          <h2 className="text-2xl font-black tracking-tighter">Design brief</h2>
          <ul className="mt-6 space-y-4">
            {details.designNotes.map((note) => (
              <li className="flex gap-3 text-sm leading-6 text-[#11110f]/68" key={note}>
                <CheckCircle2 className="text-accent mt-0.5 size-4 shrink-0" />
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
          className="bg-accent inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-white transition duration-300 hover:-translate-y-1"
          href="/dashboard"
        >
          Use this template <ArrowRight size={15} />
        </Link>
      </aside>
    </section>
  );
}
