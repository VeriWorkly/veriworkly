import type { TemplateSummary } from "@/templates/catalog/templates";

import { templatesShell } from "../constants";
import type { TemplateDetails } from "../data/template-details";

const TemplateBestFit = ({
  template,
  details,
}: {
  template: TemplateSummary;
  details: TemplateDetails;
}) => {
  return (
    <section className="dark:bg-paper-2 bg-[#11110f] py-24 text-[#f5f4ef] md:py-32">
      <div className={`${templatesShell} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
        <div>
          <p className="dark:text-accent mb-5 text-[0.72rem] font-bold tracking-[0.16em] text-[#93c5fd] uppercase">
            Best fit
          </p>

          <h2 className="max-w-2xl text-[clamp(3rem,6vw,6rem)] leading-none tracking-tighter">
            Use {template.name} when the portfolio needs this kind of reader.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {details.bestFor.map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-white/10 bg-white/4 p-5 text-sm leading-6 font-semibold"
            >
              {item}
            </div>
          ))}

          <div className="bg-accent border-accent text-accent-ink rounded-3xl border p-5 text-sm leading-6 font-semibold sm:col-span-2">
            Motion direction: {details.motion}
          </div>

          {details.system?.targetProfessions && (
            <div className="mt-8 border-t border-white/10 pt-8 sm:col-span-2">
              <h3 className="mb-4 text-lg font-bold tracking-tight text-white">
                Suitability by target role
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {details.system.targetProfessions.map((prof) => (
                  <div
                    key={prof.role}
                    className="rounded-2xl border border-white/10 bg-white/2 p-4.5"
                  >
                    <h4 className="text-accent dark:text-accent mb-1.5 animate-pulse font-mono text-[10px] font-bold tracking-wider uppercase">
                      {prof.role}
                    </h4>
                    <p className="text-xs leading-relaxed text-white/70">{prof.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TemplateBestFit;
