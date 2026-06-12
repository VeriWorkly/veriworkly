import type { LucideIcon } from "lucide-react";
import { LayoutTemplate, Search, Sparkles } from "lucide-react";

import { templatesShell } from "../constants";

const benefits: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Sparkles,
    title: "For first impressions",
    description:
      "Use Signal when the reader needs proof fast. Use Atelier when the story and voice need more space.",
  },
  {
    icon: Search,
    title: "For portfolio SEO",
    description:
      "Every template is built around clear headings, linkable public routes, metadata, and crawlable content.",
  },
  {
    icon: LayoutTemplate,
    title: "For future switching",
    description:
      "Your projects, bio, social links, services, and profile settings stay reusable across template directions.",
  },
];

export function TemplateBenefits() {
  return (
    <section className={`${templatesShell} grid gap-4 py-24 lg:grid-cols-3`}>
      {benefits.map(({ icon: Icon, title, description }) => (
        <article className="rounded-3xl border border-[#11110f]/15 bg-white p-6" key={title}>
          <Icon className="text-accent size-5" />
          <h3 className="mt-8 text-3xl font-black tracking-[-0.06em]">{title}</h3>
          <p className="mt-4 text-sm leading-7 text-[#11110f]/60">{description}</p>
        </article>
      ))}
    </section>
  );
}
