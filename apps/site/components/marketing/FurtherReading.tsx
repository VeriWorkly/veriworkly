import { ArrowUpRight } from "lucide-react";

import { blogGuideUrl, type BlogGuide } from "@/config/blog-guides";

/** A short line of blog guides under a section: crawlable in-body links, not a card grid. */
export function FurtherReading({
  guides,
  className = "",
}: {
  guides: BlogGuide[];
  className?: string;
}) {
  return (
    <nav aria-label="Further reading" className={`text-base leading-7 ${className}`}>
      <span className="text-muted">Further reading: </span>
      {guides.map((guide, index) => (
        <span key={guide.slug}>
          {index > 0 ? <span className="text-muted"> · </span> : null}
          <a
            href={blogGuideUrl(guide)}
            className="text-accent inline-flex items-center gap-0.5 font-medium underline-offset-4 hover:underline"
          >
            {guide.title}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </span>
      ))}
    </nav>
  );
}
