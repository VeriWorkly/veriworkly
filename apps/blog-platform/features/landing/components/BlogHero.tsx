import Link from "next/link";
import { BookOpen, PenTool } from "lucide-react";

import { Button, Card } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

interface BlogHeroProps {
  postCount: number;
}

export const BlogHero = ({ postCount }: BlogHeroProps) => {
  return (
    <section
      aria-labelledby="blog-hero-heading"
      className="border-border bg-card relative overflow-hidden rounded-4xl border px-6 py-10 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] md:px-10 md:py-14"
    >
      <div className="bg-accent/12 pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full blur-3xl" />
      <div className="bg-accent/10 pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full blur-3xl" />

      <div className="relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-8">
          <p className="text-muted text-xs font-semibold tracking-[0.28em] uppercase">
            VeriWorkly Blog
          </p>

          <h1
            id="blog-hero-heading"
            className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            Engineering <span className="text-accent">Stories.</span>
          </h1>

          <p className="text-muted max-w-2xl text-base leading-8 md:text-lg">
            Thoughts from the VeriWorkly team on career engineering, privacy-first technology, and
            the future of professional storytelling.
          </p>

          <div className="flex flex-wrap items-center justify-start gap-4">
            <Button
              asChild
              size="lg"
              variant="primary"
              className="h-14 px-8 text-base shadow-xl shadow-blue-500/20"
            >
              <Link href="/archive" aria-label="Read articles">
                Explore Archive
              </Link>
            </Button>

            <Button asChild size="lg" variant="secondary">
              <Link href={siteConfig.links.app} aria-label="Open resume builder">
                Open Resume Builder
              </Link>
            </Button>

            <div className="text-muted flex items-center gap-2 text-sm font-medium italic">
              Built with{" "}
              <Link
                href="https://fumadocs.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-bold hover:underline"
              >
                Fumadocs
              </Link>
            </div>
          </div>

          <nav
            aria-label="Career guides"
            className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-5 text-sm"
          >
            <span className="text-muted font-semibold">Career guides:</span>
            <Link
              href="/ats-friendly-resume-format"
              className="text-accent font-semibold hover:underline"
            >
              ATS-friendly resume format
            </Link>
            <Link
              href="/how-long-should-a-resume-be"
              className="text-accent font-semibold hover:underline"
            >
              How long should a resume be?
            </Link>
            <Link
              href="/free-resume-builders-compared"
              className="text-accent font-semibold hover:underline"
            >
              Free resume builders compared
            </Link>
            <Link
              href="/why-some-resume-pdfs-parse-as-blank"
              className="text-accent font-semibold hover:underline"
            >
              Fix a blank resume PDF
            </Link>
          </nav>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="bg-background/70 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 flex size-10 items-center justify-center rounded-lg">
                <PenTool className="text-accent size-5" />
              </div>

              <div>
                <p className="text-foreground font-semibold">{postCount}</p>
                <p className="text-muted text-xs">Articles published</p>
              </div>
            </div>
          </Card>

          <Card className="bg-background/70 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 flex size-10 items-center justify-center rounded-lg">
                <BookOpen className="text-accent size-5" />
              </div>

              <div>
                <p className="text-foreground font-semibold">Open Source</p>
                <p className="text-muted text-xs">Public roadmap and releases</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
