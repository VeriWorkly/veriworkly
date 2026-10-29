import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface LegalHeroMetaProps {
  effectiveDate: string;
  /** ISO date (YYYY-MM-DD): the text promises readers a "Last updated" date. */
  lastUpdated: string;
  links: { label: string; href: string }[];
}

const formatIsoDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export function LegalHeroMeta({ effectiveDate, lastUpdated, links }: LegalHeroMetaProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-base">
          <span className="text-muted">Effective</span>{" "}
          <span className="font-semibold">{effectiveDate}</span>
        </p>
        <p className="text-base">
          <span className="text-muted">Last updated</span>{" "}
          <time dateTime={lastUpdated} className="font-semibold">
            {formatIsoDate(lastUpdated)}
          </time>
        </p>
      </div>

      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group text-accent focus-visible:ring-accent/40 inline-flex items-center gap-2 rounded-full text-base font-semibold focus-visible:ring-2 focus-visible:outline-none"
            >
              {link.label}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
