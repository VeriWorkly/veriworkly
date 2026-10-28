import Link from "next/link";
import { ArrowRight, Code, Cpu, Gauge, Shield } from "lucide-react";

import { Card, cn } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

const pillars = [
  {
    title: "Local-First Core",
    desc: "As a guest, data stays in your browser. Signed-in accounts sync by default; keep any document on this device only. Learn about our sync protocol and storage architecture.",
    icon: Cpu,
    href: "/docs/architecture/monorepo",
    bg: "bg-blue-500/10",
    text: "text-blue-600",
  },

  {
    title: "API-Driven Workflows",
    desc: "Work with your documents from your own tools through the REST API and scoped API keys.",
    icon: Code,
    href: "/api-reference",
    bg: "bg-purple-500/10",
    text: "text-purple-600",
  },

  {
    title: "Open-Source ATS Engine",
    desc: "Parse, score and match resumes in your own product with the MIT-licensed engine behind our ATS checker.",
    icon: Gauge,
    href: "/ats-engine",
    bg: "bg-amber-500/10",
    text: "text-amber-600",
  },

  {
    title: "Privacy & Security",
    desc: "Data ownership is at the heart of VeriWorkly. Read how we store, sync and protect your data.",
    icon: Shield,
    href: `${siteConfig.links.main}/privacy`,
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
  },
];

export const CorePillars = () => {
  return (
    <section className="space-y-12">
      <div className="space-y-4 text-center">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Architecture</p>

        <h2 className="text-foreground text-3xl font-semibold tracking-tight">
          Engineering Pillars
        </h2>

        <p className="text-muted mx-auto max-w-2xl text-lg">
          Our documentation is structured around the values that drive VeriWorkly.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {pillars.map((item) => (
          <Link key={item.title} href={item.href} className="group">
            <Card className="border-border/50 hover:border-accent/40 h-full transition-all duration-300 hover:shadow-xl">
              <div className="flex h-full flex-col p-6">
                <div
                  className={cn(
                    "mb-6 flex size-12 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                    item.bg,
                  )}
                >
                  <item.icon className={cn("size-6", item.text)} />
                </div>

                <h3 className="text-foreground mb-3 text-xl font-semibold tracking-tight">
                  {item.title}
                </h3>

                <p className="text-muted mb-6 text-sm leading-relaxed font-medium">{item.desc}</p>

                <div className="mt-auto flex items-center gap-2 text-[10px] font-bold tracking-widest text-blue-600 uppercase transition-colors group-hover:text-blue-500">
                  Learn More{" "}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};
