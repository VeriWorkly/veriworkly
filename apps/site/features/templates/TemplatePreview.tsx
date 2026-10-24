import Image from "next/image";

import { cn } from "@veriworkly/ui";

import type { TemplateSummary } from "@/config/templates";

type Props = {
  template: Pick<TemplateSummary, "name" | "documentType" | "documentTypeLabel" | "previewImage">;
  sizes: string;
  /** "lcp": the page's largest image (eager, high fetch priority); "eager": above the fold. */
  loading?: "lcp" | "eager";
  className?: string;
};

/**
 * A template's real preview at its real shape: documents are a sheet of 8.5x11 paper,
 * portfolio websites are a wide browser screenshot (1900x937). Cropping either into the
 * other's frame throws away most of the picture, so the shape follows the document type.
 */
const TemplatePreview = ({ template, sizes, loading, className }: Props) => {
  const isPortfolio = template.documentType === "portfolio-website";

  return (
    <div
      className={cn(
        // The sheet edge: a white page on a white band otherwise has no outline at all.
        "ring-foreground/10 relative overflow-hidden bg-white ring-1",
        isPortfolio ? "aspect-1900/937 rounded-2xl" : "aspect-8.5/11 rounded-md",
        className,
      )}
    >
      <Image
        fill
        sizes={sizes}
        loading={loading ? "eager" : undefined}
        fetchPriority={loading === "lcp" ? "high" : undefined}
        src={template.previewImage}
        alt={`${template.name} ${template.documentTypeLabel.toLowerCase()} template preview`}
        className={isPortfolio ? "object-cover object-top" : "object-contain object-top"}
      />
    </div>
  );
};

export default TemplatePreview;
