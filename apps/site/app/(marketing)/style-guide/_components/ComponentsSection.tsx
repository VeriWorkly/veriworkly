import Link from "next/link";
import { Component, ArrowRight, CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";

import { Card, Button, Badge } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

import { SectionHeader } from "./SectionHeader";

/**
 * Every status colour here resolves to a theme token, never a raw Tailwind shade.
 * A status painted in `emerald-500` is invisible to the design system: it will not
 * follow a theme change and it appears in no palette.
 */
const STATUSES = [
  {
    label: "Success",
    token: "--success",
    icon: CheckCircle2,
    classes: "text-success border-success/25 bg-success/10",
  },
  {
    label: "Info",
    token: "--accent",
    icon: Info,
    classes: "text-accent border-accent/25 bg-accent/10",
  },
  {
    label: "Warning",
    token: "--warning",
    icon: AlertTriangle,
    classes: "text-warning border-warning/25 bg-warning/10",
  },
  {
    label: "Error",
    token: "--destructive",
    icon: XCircle,
    classes: "text-destructive border-destructive/25 bg-destructive/10",
  },
];

export const ComponentsSection = () => {
  return (
    <section id="components" className="scroll-mt-24 space-y-8">
      <SectionHeader icon={Component} title="Components" />

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="space-y-6 p-8">
          <h3 className="text-lg font-semibold">Buttons</h3>

          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Default</Button>

            <Button variant="secondary">Secondary</Button>

            <Button variant="ghost">Ghost</Button>
          </div>

          <p className="text-muted text-xs leading-relaxed">
            Primary carries the accent fill and is limited to one per view. Secondary and ghost are
            for everything else.
          </p>
        </Card>

        <Card className="space-y-6 p-8">
          <h3 className="text-lg font-semibold">Badges</h3>

          <div className="flex flex-wrap gap-4">
            <Badge>Default</Badge>

            {STATUSES.map((status) => (
              <Badge key={status.label} className={status.classes}>
                {status.label}
              </Badge>
            ))}
          </div>

          <p className="text-muted text-xs leading-relaxed">
            Status badges use a 10% fill and a 25% border of their own token, so the same badge
            works on both the page and card backgrounds.
          </p>
        </Card>

        <Card className="space-y-6 p-8">
          <h3 className="text-lg font-semibold">Interactive Elements</h3>

          <div className="flex flex-col items-start gap-4">
            {/* Docs live on their own subdomain. `/docs` is not a route on this app
                and was a soft-404. */}
            <Link
              target="_blank"
              rel="noreferrer"
              href={siteConfig.links.docs}
              className="group text-accent focus-visible:ring-accent flex items-center gap-2 rounded text-sm font-bold tracking-wider uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Open Docs
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/templates"
              className="focus-visible:ring-accent rounded text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Browse Templates
            </Link>

            <Link
              href={siteConfig.links.blog}
              className="focus-visible:ring-accent rounded text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Visit Blog
            </Link>
          </div>
        </Card>

        <Card className="space-y-6 p-8">
          <h3 className="text-lg font-semibold">Status Colours</h3>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATUSES.map((status) => (
              <div key={status.label} className="flex flex-col items-center gap-2 text-center">
                <status.icon
                  className={`size-6 ${status.classes.split(" ")[0]}`}
                  aria-hidden="true"
                />

                <span className="text-muted text-[10px] font-bold uppercase">{status.label}</span>

                <span className="text-muted font-mono text-[9px]">{status.token}</span>
              </div>
            ))}
          </div>

          <p className="text-muted text-xs leading-relaxed">
            Four states, four tokens. Informational states reuse the accent rather than introducing
            a fifth hue.
          </p>
        </Card>
      </div>
    </section>
  );
};
