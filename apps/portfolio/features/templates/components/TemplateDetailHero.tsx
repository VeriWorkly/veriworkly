import { LayoutTemplate } from "lucide-react";

import type { TemplateDetails } from "../data/template-details";
import type { TemplateSummary } from "@/templates/catalog/templates";

import { templatesShell } from "../constants";

const TemplateDetailHero = ({
  template,
  details,
}: {
  template: TemplateSummary;
  details: TemplateDetails;
}) => {
  return (
    <header
      className={`${templatesShell} grid gap-10 pt-20 pb-14 lg:grid-cols-[1fr_26rem] lg:items-end`}
    >
      <div>
        <p className="bg-accent inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white">
          <LayoutTemplate size={13} /> Live portfolio template
        </p>

        <h1 className="mt-7 max-w-6xl text-[clamp(3.8rem,8vw,7.5rem)] leading-none font-bold tracking-tighter wrap-normal">
          <span className="sr-only">{template.name} Portfolio Template: </span>
          {template.name} is built for {template.audience.toLowerCase()}.
        </h1>
      </div>

      <div className="border-ink-2 border-t-2 pt-6">
        <p className="text-ink-2/62 text-sm leading-7">{details.positioning}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {template.strengths.map((strength) => (
            <span
              key={strength}
              className="border-ink-2/15 bg-panel rounded-full border px-3 py-1.5 text-xs font-bold"
            >
              {strength}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
};

export default TemplateDetailHero;
