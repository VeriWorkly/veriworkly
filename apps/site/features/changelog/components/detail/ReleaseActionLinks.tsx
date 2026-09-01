import Link from "next/link";
import { ExternalLink, GitCompareArrows } from "lucide-react";

interface ReleaseActionLinksProps {
  compareUrl: string | null;
  olderVersion?: string;
  githubUrl: string | null;
}

const linkClass =
  "border-border/40 text-muted hover:text-foreground hover:border-border/60 hover:bg-muted/5 group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-sans text-xs font-semibold whitespace-nowrap transition-colors";

export const ReleaseActionLinks = ({
  compareUrl,
  olderVersion,
  githubUrl,
}: ReleaseActionLinksProps) => {
  if (!compareUrl && !githubUrl) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {compareUrl && (
        <Link target="_blank" href={compareUrl} className={linkClass} rel="noopener noreferrer">
          <GitCompareArrows className="h-3 w-3" aria-hidden="true" />
          Compare with v{olderVersion}
        </Link>
      )}

      {githubUrl && (
        <Link target="_blank" href={githubUrl} className={linkClass} rel="noopener noreferrer">
          View on GitHub
          <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}
    </div>
  );
};

export default ReleaseActionLinks;
