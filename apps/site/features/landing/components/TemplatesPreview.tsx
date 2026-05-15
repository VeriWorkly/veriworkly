import Link from "next/link";

import { Card, Badge } from "@veriworkly/ui";

import { templateSummaries } from "@/config/templates";

const TemplatesPreview = () => {
  const featured = templateSummaries.slice(0, 3);

  return (
    <section className="space-y-5" aria-labelledby="templates-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Templates</p>

          <h2
            id="templates-heading"
            className="text-foreground text-3xl font-semibold tracking-tight"
          >
            Pick a style. Keep your content.
          </h2>

          <p className="sr-only">
            Free resume templates for creating professional and ATS-friendly resumes online.
          </p>
        </div>

        <Link
          className="text-accent text-sm font-medium"
          href="/templates"
          aria-label="View all resume templates"
        >
          View all templates
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3" role="list">
        {featured.map((template) => (
          <Card className="space-y-4 p-6" key={template.id} role="listitem">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-foreground text-lg font-semibold">
                {template.name} Resume Template
              </h3>

              <span
                aria-hidden="true"
                className="h-2.5 w-10 rounded-full"
                style={{ backgroundColor: template.accentColor }}
              />
            </div>

            <p className="text-muted text-sm leading-6">{template.description}</p>

            <div className="flex flex-wrap gap-2">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} className="text-muted px-2 py-0.5 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <Link
              href={`/templates/${template.id}`}
              className="text-accent text-sm font-medium"
              aria-label={`Preview ${template.name} resume template`}
            >
              Preview
            </Link>
          </Card>
        ))}
      </div>

      <p className="sr-only">
        Browse free resume templates including Executive Clarity and Precision ATS layouts.
      </p>
    </section>
  );
};

export default TemplatesPreview;
