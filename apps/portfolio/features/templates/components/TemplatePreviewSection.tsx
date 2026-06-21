import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

import type { TemplateDetails } from "../data/template-details";
import type { TemplateSummary } from "@/templates/catalog/templates";

import { PortfolioTemplatePreviewFrame } from "@/components/PortfolioTemplatePreviewFrame";

import { templatesShell } from "../constants";

const TemplatePreviewSection = ({
  template,
  details,
}: {
  template: TemplateSummary;
  details: TemplateDetails;
}) => {
  return (
    <section className={`${templatesShell} grid gap-8 pb-20 lg:grid-cols-[minmax(0,1fr)_22rem]`}>
      <PortfolioTemplatePreviewFrame
        ariaHidden
        interactive
        templateId={template.id}
        title={`${template.name} live preview`}
      />

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="border-ink-2 bg-panel rounded-3xl border-2 p-6 shadow-[10px_12px_0_rgba(37,99,235,0.14)]">
          <h2 className="text-2xl font-bold tracking-tighter">Design brief</h2>

          <ul className="mt-6 space-y-4">
            {details.designNotes.map((note) => (
              <li className="text-ink-2/68 flex gap-3 text-sm leading-6" key={note}>
                <CheckCircle2 className="text-accent mt-0.5 size-4 shrink-0" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href={`/templates/${template.id}/preview`}
          className="bg-ink-2 text-paper inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition duration-300 hover:-translate-y-1"
        >
          Full page review <ExternalLink size={15} />
        </Link>

        <Link
          href="/dashboard"
          className="bg-accent inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white transition duration-300 hover:-translate-y-1"
        >
          Use this template <ArrowRight size={15} />
        </Link>
      </aside>
    </section>
  );
};

export default TemplatePreviewSection;
