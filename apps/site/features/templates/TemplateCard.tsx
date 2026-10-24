import Link from "next/link";

import { cn } from "@veriworkly/ui";

import type { TemplateCardData } from "./cardFields";

import TemplatePreview from "./TemplatePreview";
import { getTemplateHref } from "./utils";

type TemplateCardProps = {
  template: TemplateCardData;
  loading?: "eager";
  /** h2 directly under the page H1 (gallery), h3 inside a titled section. */
  heading?: "h2" | "h3";
};

/**
 * One template as a gallery tile: the real export, its name, its style and one line about it.
 * Small enough that a row holds three or four, so a long catalogue stays browsable; the detail
 * page carries everything else.
 */
const TemplateCard = ({ template, loading, heading: Heading = "h2" }: TemplateCardProps) => {
  const isPortfolio = template.documentType === "portfolio-website";

  return (
    <Link
      href={getTemplateHref(template)}
      className="group focus-visible:ring-accent/40 flex h-full flex-col rounded-3xl focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
    >
      <div
        className={cn(
          "bg-card group-hover:bg-foreground/6 flex items-center justify-center rounded-3xl transition-colors duration-200",
          isPortfolio ? "p-3 sm:p-4" : "p-5 sm:p-6",
        )}
      >
        <TemplatePreview
          loading={loading}
          template={template}
          sizes={
            isPortfolio
              ? "(min-width: 1280px) 360px, (min-width: 640px) 46vw, 92vw"
              : "(min-width: 1280px) 230px, (min-width: 768px) 28vw, 42vw"
          }
          className="w-full transition-transform duration-300 ease-out group-hover:-translate-y-1"
        />
      </div>

      <div className="mt-4 px-1">
        <Heading className="group-hover:text-accent text-lg leading-snug font-semibold tracking-tight transition-colors duration-200">
          {template.name}
        </Heading>
        <p className="text-muted mt-1 flex items-start gap-2 text-sm leading-5">
          <span
            aria-hidden="true"
            className="mt-1.5 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: template.accentColor }}
          />
          <span>
            {template.family} · {template.layout}
          </span>
        </p>
        <p className="text-muted mt-2 line-clamp-2 text-sm leading-6 text-pretty">
          {template.shortDescription}
        </p>
      </div>
    </Link>
  );
};

/** The grid a set of tiles sits in. Documents are tall sheets, portfolios are wide screens. */
export const templateGridClass = (isPortfolio: boolean) =>
  isPortfolio
    ? "grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3"
    : "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4";

export default TemplateCard;
