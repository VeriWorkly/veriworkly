import { LayoutTemplate } from "lucide-react";

import { templatesShell } from "../constants";

const TemplatesHero = () => {
  return (
    <header className="relative pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="bg-accent/12 pointer-events-none absolute top-20 -right-32 size-96 rounded-full blur-3xl" />
      <div className="bg-accent/6 pointer-events-none absolute top-40 -left-32 size-96 rounded-full blur-3xl" />

      <div className={`mx-auto ${templatesShell}`}>
        <div className="grid items-end gap-12 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <p className="border-line bg-panel/60 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase backdrop-blur">
              <LayoutTemplate className="text-accent size-3.5" /> Live portfolio website templates
            </p>

            <h1 className="text-ink mt-8 max-w-5xl text-[clamp(3.5rem,9vw,7.6rem)] leading-none font-bold tracking-tighter">
              <span className="sr-only">VeriWorkly Portfolio Templates: </span>
              Choose the site your work deserves.
            </h1>
          </div>

          <div className="border-line-strong border-t-2 pt-6">
            <p className="text-ink/75 max-w-md text-base leading-7">
              Each VeriWorkly template uses the same portfolio data, so you can fill content once,
              preview different directions, and switch the presentation without starting over.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TemplatesHero;
