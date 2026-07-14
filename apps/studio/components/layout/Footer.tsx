import Link from "next/link";

import { siteConfig } from "@/config/site";
import { Container, Badge } from "@veriworkly/ui";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/60 bg-card/70 relative overflow-hidden border-t">
      <div className="via-accent/40 absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />

      <Container className="relative grid gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div className="space-y-5">
          <Link
            href="/"
            className="border-border/60 bg-background/70 hover:bg-card inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold tracking-tight backdrop-blur transition-colors"
          >
            {siteConfig.name}
          </Link>

          <p className="text-muted max-w-md text-sm leading-relaxed">
            A local-first resume studio with cloud sync, public roadmap views, and a cleaner
            workflow for people who want control over their data.
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-background/80 text-muted">Local-first</Badge>
            <Badge className="bg-background/80 text-muted">Cloud sync</Badge>
            <Badge className="bg-background/80 text-muted">Open source</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-foreground text-xs font-semibold tracking-[0.2em] uppercase">
            Product
          </p>

          <Link
            href="/"
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Overview
          </Link>

          <Link
            href={`${siteConfig.links.main}/templates`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Templates
          </Link>

          <Link
            href={`${siteConfig.links.main}/roadmap`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Roadmap
          </Link>

          <Link
            href={`${siteConfig.links.main}/stats`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Development
          </Link>

          <Link
            href={siteConfig.links.blog}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Blog
          </Link>

          <Link
            href={siteConfig.links.docs}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Documentation
          </Link>

          <Link
            href={`${siteConfig.links.main}/style-guide`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Style Guide
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-foreground text-xs font-semibold tracking-[0.2em] uppercase">
            Company
          </p>

          <Link
            href={`${siteConfig.links.main}/about`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            About
          </Link>

          <Link
            href={`${siteConfig.links.main}/contact`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Contact
          </Link>

          <Link
            href={`${siteConfig.links.main}/faq`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            FAQ
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-foreground text-xs font-semibold tracking-[0.2em] uppercase">Legal</p>

          <Link
            href={`${siteConfig.links.main}/privacy`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Privacy
          </Link>

          <Link
            href={`${siteConfig.links.main}/security`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Security
          </Link>

          <Link
            href={`${siteConfig.links.main}/terms`}
            className="text-muted hover:text-foreground w-fit text-sm transition-colors"
          >
            Terms
          </Link>

          <p className="text-muted/70 text-xs leading-relaxed">
            Built to keep resume data portable, private, and easy to audit.
          </p>
        </div>
      </Container>

      <div className="border-border/50 border-t">
        <Container className="text-muted/70 flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} {siteConfig.name}. Built for the community.
          </p>
          <p>Designed for fast editing, syncing, and sharing.</p>
        </Container>
      </div>
    </footer>
  );
};

export default Footer;
