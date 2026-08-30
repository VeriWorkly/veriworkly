import Link from "next/link";
import { Download } from "lucide-react";

import { pressFacts } from "@/config/brand";

const SECTIONS = [
  { href: "#logo", label: "Logo" },
  { href: "#colors", label: "Colors" },
  { href: "#typography", label: "Typography" },
  { href: "#social", label: "Social" },
  { href: "#voice", label: "Voice" },
  { href: "#boilerplate", label: "Boilerplate" },
  { href: "#press", label: "Press" },
];

const BrandKitHeader = () => {
  return (
    <header className="space-y-4">
      <p className="text-accent text-xs font-semibold tracking-[0.28em] uppercase">Press & Brand</p>

      <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
        Brand Kit
      </h1>

      <p className="text-muted max-w-2xl text-base leading-8 md:text-lg">
        Official logos, both colour palettes, typography, share cards, and voice guidelines for
        writing or designing about VeriWorkly - in blog posts, integrations, comparisons, or press
        coverage.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link
          href="/brand/veriworkly-brand-kit.zip"
          download
          className="bg-accent text-accent-foreground focus-visible:ring-accent inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Download className="size-4" aria-hidden="true" />
          Download Brand Kit (.zip)
        </Link>

        <Link
          href="/style-guide"
          className="text-accent focus-visible:ring-accent rounded text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          View Full Design System
        </Link>

        <span className="text-muted text-xs" aria-hidden="true">
          •
        </span>

        <Link
          href={pressFacts.repository}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-foreground focus-visible:ring-accent rounded text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Source on GitHub
        </Link>
      </div>

      <nav aria-label="Brand kit sections" className="border-border border-t pt-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="text-muted hover:text-accent focus-visible:ring-accent rounded font-mono text-xs tracking-wider uppercase transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};

export default BrandKitHeader;
