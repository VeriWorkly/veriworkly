import type { ReactNode } from "react";

import type { TemplateDetails } from "../data/template-details";
import type { TemplateSummary } from "@/templates/catalog/templates";

import { templatesShell } from "../constants";

function GuideBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="border-ink-2/15 bg-paper rounded-3xl border p-5">
      <h3 className="text-xl font-bold tracking-[-0.04em]">{title}</h3>
      <p className="text-ink-2/62 mt-4 text-sm leading-7">{children}</p>
    </article>
  );
}

const TemplateStyleGuide = ({
  template,
  details,
}: {
  template: TemplateSummary;
  details: TemplateDetails;
}) => {
  return (
    <section className={`${templatesShell} pb-24`}>
      <div className="border-ink-2 bg-panel rounded-4xl border-2 p-6 shadow-[14px_16px_0_rgba(37,99,235,0.12)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-accent text-xs font-bold tracking-[0.16em] uppercase">
              Template style guide
            </p>

            <h2 className="mt-4 max-w-xl text-[clamp(2.8rem,5vw,5.5rem)] leading-none tracking-tighter">
              The design system behind {template.name}.
            </h2>

            <p className="text-ink-2/62 mt-5 max-w-md text-sm leading-7">
              Use this guide to decide whether the template matches your work before you publish.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {details.colorScheme.map((color) => (
                <div
                  className="border-ink-2/15 bg-paper overflow-hidden rounded-2xl border"
                  key={color.name}
                >
                  <div className={`border-ink/50 h-24 border-b ${color.className}`} />

                  <div className="p-3">
                    <p className="text-xs font-bold">{color.name}</p>
                    <p className="text-ink-2/55 mt-1 font-mono text-[10px]">{color.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <GuideBlock title="Layout rhythm">{details.layout}</GuideBlock>
              <GuideBlock title="Component language">{details.componentLanguage}</GuideBlock>
            </div>

            <div className="rounded-3xl border border-[#11110f]/15 bg-[#11110f] p-5 text-white">
              <h3 className="text-xl font-bold tracking-[-0.04em]">Best content to prepare</h3>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {details.contentModel.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 font-semibold text-white/70"
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
  );
};

export default TemplateStyleGuide;
