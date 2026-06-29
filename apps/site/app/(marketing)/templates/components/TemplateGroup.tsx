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
      <div className="border-border flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight">{group.title}</h2>
          <p className="text-muted text-sm leading-6">{group.description}</p>
        </div>

        <p className="text-muted border-border bg-card rounded-full border px-3 py-1.5 text-sm font-medium">
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
