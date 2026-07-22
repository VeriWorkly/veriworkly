import type { TemplateSummary } from "@/config/templates";
import TemplateCard from "./TemplateCard";

type TemplateGroupProps = {
  group: {
    title: string;
    description: string;
    items: TemplateSummary[];
  };
};

const TemplateGroup = ({ group }: TemplateGroupProps) => {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            {group.title}
          </h2>
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">{group.description}</p>
        </div>

        <p className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400">
          {group.items.length} available
        </p>
      </div>

      <div className="grid gap-6">
        {group.items.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </section>
  );
};

export default TemplateGroup;
