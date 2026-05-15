import Link from "next/link";

const NAV_LINKS = [
  { href: "#colors", label: "Colors" },
  { href: "#typography", label: "Typography" },
  { href: "#components", label: "Components" },
  { href: "#brand-assets", label: "Brand Assets" },
  { href: "#effects", label: "Effects" },
  { href: "#layout", label: "Layout" },
];

export const StyleGuideHeader = () => {
  return (
    <header className="space-y-4">
      <p className="text-accent text-xs font-semibold tracking-[0.28em] uppercase">Design System</p>

      <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
        Style Guide <span className="sr-only">for VeriWorkly Design System</span>
      </h1>

      <p className="text-muted max-w-2xl text-base leading-8 md:text-lg">
        A complete design system guide for VeriWorkly including UI components, colors, typography,
        and layouts.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link href="/" className="text-accent text-sm font-semibold hover:underline">
          Back to Home
        </Link>

        {NAV_LINKS.map((link) => (
          <div key={link.href} className="flex items-center gap-3">
            <span className="text-muted text-xs">•</span>
            <Link
              href={link.href}
              className="text-muted hover:text-foreground text-sm transition-colors"
            >
              {link.label}
            </Link>
          </div>
        ))}
      </div>
    </header>
  );
};
