import Link from "next/link";
import { Shield, Code, Zap, ArrowRight } from "lucide-react";

import { Card } from "@veriworkly/ui";

const featuredDocs = [
  {
    title: "Getting Started",
    description:
      "Learn how to build your first career document or web portfolio in minutes with our step-by-step guide.",
    href: "https://docs.veriworkly.com/docs/getting-started",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },

  {
    title: "Privacy Architecture",
    description: "Deep dive into our local-first engine and how we keep your data 100% private.",
    href: "https://docs.veriworkly.com/docs/architecture",
    icon: Shield,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },

  {
    title: "API Reference",
    description: "Explore our developer-first API to automate your career document workflows.",
    href: "https://docs.veriworkly.com/api-reference",
    icon: Code,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
];

const DocsSection = () => {
  return (
    <section className="space-y-8" aria-labelledby="docs-heading">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-2">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Documentation
          </p>

          <h2 id="docs-heading" className="text-foreground text-3xl font-semibold tracking-tight">
            Built for users. Loved by developers.
          </h2>

          <p className="text-muted max-w-2xl text-base leading-7">
            Explore our comprehensive guides to understand the engineering behind VeriWorkly or
            learn how to get the most out of the builder.
          </p>
        </div>

        <Link
          href="https://docs.veriworkly.com"
          className="text-accent hover:text-accent/80 flex items-center gap-2 text-sm font-bold transition-colors"
        >
          View Full Docs <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {featuredDocs.map((doc) => (
          <Card
            key={doc.title}
            className="group relative overflow-hidden border-zinc-200/50 bg-white/50 p-8 backdrop-blur-sm transition-all hover:border-zinc-300 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
          >
            <div
              className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${doc.bg} ${doc.color} transition-transform group-hover:scale-110`}
            >
              <doc.icon className="h-6 w-6" />
            </div>

            <h3 className="text-foreground mb-3 line-clamp-1 text-xl font-bold tracking-tight">
              {doc.title}
            </h3>

            <p className="text-muted mb-6 line-clamp-2 text-sm leading-relaxed">
              {doc.description}
            </p>

            <Link href={doc.href} className="absolute inset-0">
              <span className="sr-only">Read {doc.title}</span>
            </Link>

            <div className="group-hover:text-foreground flex items-center gap-2 text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-colors">
              Read Guide{" "}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default DocsSection;
