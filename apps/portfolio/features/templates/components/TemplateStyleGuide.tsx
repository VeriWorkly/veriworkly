import type { ReactNode } from "react";

import type { TemplateSummary } from "@/templates/catalog/templates";

import { templatesShell } from "../constants";
import type { TemplateDetails } from "../data/template-details";

export function TemplateStyleGuide({
  template,
  details,
}: {
  template: TemplateSummary;
  details: TemplateDetails;
}) {
  return (
    <section className={`${templatesShell} pb-24`}>
      <div className="rounded-4xl border-2 border-[#11110f] bg-white p-6 shadow-[14px_16px_0_rgba(37,99,235,0.12)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-accent text-xs font-black tracking-[0.16em] uppercase">
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
                    <p className="mt-1 font-mono text-[10px] text-[#11110f]/55">{color.value}</p>
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
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 font-bold text-white/72"
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
