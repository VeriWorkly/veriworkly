import Link from "next/link";

import { Badge } from "@veriworkly/ui";

import { TemplateDefinition } from "@/types/template";

import { buildEditorUrl } from "./utils";

export function TemplateDetailHeader({ template }: { template: TemplateDefinition }) {
  const editorUrl = buildEditorUrl(template.id, template.documentType);

  return (
    <header className="space-y-6">
      <div className="space-y-3">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
          Template Detail
        </p>

        <h1 className="text-foreground text-4xl font-semibold tracking-tight">{template.name}</h1>

        <p className="text-muted max-w-2xl text-base leading-7">{template.description}</p>

        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </div>

      <nav className="border-border/40 flex items-center gap-6 border-b pb-6 text-sm font-medium">
        <Link href={editorUrl} className="text-accent hover:underline">
          Use in editor
        </Link>

        <Link href="/templates" className="text-muted hover:text-foreground transition-colors">
          Back to templates
        </Link>
      </nav>
    </header>
  );
}
