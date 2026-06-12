import { LayoutTemplate } from "lucide-react";

import { templatesShell } from "../constants";

export function TemplatesHero() {
  return (
    <header className={`${templatesShell} grid gap-10 pt-20 pb-16 lg:grid-cols-[1fr_24rem] lg:items-end`}>
      <div>
        <p className="bg-accent inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black text-white">
          <LayoutTemplate size={13} /> Live portfolio website templates
        </p>
        <h1 className="mt-7 max-w-6xl text-[clamp(3.8rem,8vw,7.5rem)] leading-[0.88] font-black tracking-[-0.08em] wrap-normal">
          Choose the site your work deserves.
        </h1>
      </div>
      <p className="border-t-2 border-[#11110f] pt-6 text-sm leading-7 text-[#11110f]/60">
        Each VeriWorkly template uses the same portfolio data, so you can fill content once, preview
        different directions, and switch the presentation without starting over.
      </p>
    </header>
  );
}
