import Link from "next/link";
import { Component, ArrowRight, CheckCircle2, Info, AlertTriangle } from "lucide-react";

import { Card, Button, Badge } from "@veriworkly/ui";

import { SectionHeader } from "./SectionHeader";

export const ComponentsSection = () => {
  return (
    <section id="components" className="space-y-8 scroll-mt-24">
      <SectionHeader icon={Component} title="Components" />

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="p-8 space-y-6">
          <h3 className="text-lg font-semibold">Buttons</h3>

          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="lg">
              Primary LG
            </Button>

            <Button variant="secondary" size="lg">
              Secondary LG
            </Button>

            <Button variant="primary">Default</Button>

            <Button variant="secondary">Secondary</Button>

            <Button variant="ghost">Ghost</Button>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <h3 className="text-lg font-semibold">Badges</h3>

          <div className="flex flex-wrap gap-4">
            <Badge>Default Badge</Badge>

            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Success
            </Badge>

            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Warning</Badge>

            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Error</Badge>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <h3 className="text-lg font-semibold">Interactive Elements</h3>

          <div className="flex flex-col gap-4">
            <Link
              href="/docs"
              className="group flex items-center gap-2 text-sm font-bold tracking-wider text-blue-600 uppercase"
            >
              Open Docs
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/templates"
              className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
              Browse Templates
            </Link>

            <Link
              href="https://blogs.veriworkly.com"
              className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
              Visit Blog
            </Link>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <h3 className="text-lg font-semibold">Status Icons</h3>

          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="text-emerald-500 size-6" />
              <span className="text-[10px] uppercase font-bold text-muted">Success</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Info className="text-blue-500 size-6" />
              <span className="text-[10px] uppercase font-bold text-muted">Info</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <AlertTriangle className="text-amber-500 size-6" />
              <span className="text-[10px] uppercase font-bold text-muted">Warning</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
