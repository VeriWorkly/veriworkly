import type { ReactNode } from "react";
import { Palette, Search, Type } from "lucide-react";

import { templatesShell } from "../constants";
import type { TemplateDetails } from "../data/template-details";

export function TemplateDetailCards({ details }: { details: TemplateDetails }) {
  return (
    <section className={`${templatesShell} grid gap-4 pb-24 lg:grid-cols-3`}>
      <DetailCard icon={<Type className="text-accent size-5" />} title="Typography">
        {details.fonts}
      </DetailCard>
      <DetailCard icon={<Palette className="text-accent size-5" />} title="Visual system">
        {details.palette}
      </DetailCard>
      <DetailCard icon={<Search className="text-accent size-5" />} title="SEO structure">
        Clear headings, project sections, metadata controls, and a public preview path make this
        template easier to understand and share.
      </DetailCard>
    </section>
  );
}

function DetailCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-[#11110f]/15 bg-white p-6">
      {icon}
      <h3 className="mt-8 text-3xl font-black tracking-[-0.06em]">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-[#11110f]/60">{children}</p>
    </article>
  );
}
