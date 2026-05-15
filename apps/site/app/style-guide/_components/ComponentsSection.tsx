import Link from "next/link";
import { Component, ArrowRight, CheckCircle2, Info, AlertTriangle } from "lucide-react";

import { Card, Button, Badge } from "@veriworkly/ui";

import { SectionHeader } from "./SectionHeader";

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
        </Card>

        <Card className="space-y-6 p-8">
          <h3 className="text-lg font-semibold">Badges</h3>

          <div className="flex flex-wrap gap-4">
            <Badge>Default Badge</Badge>

            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              Success
            </Badge>

            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Warning</Badge>

            <Badge className="border-red-500/20 bg-red-500/10 text-red-600">Error</Badge>
          </div>
        </Card>

        <Card className="space-y-6 p-8">
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

        <Card className="space-y-6 p-8">
          <h3 className="text-lg font-semibold">Status Icons</h3>

          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="size-6 text-emerald-500" />
              <span className="text-muted text-[10px] font-bold uppercase">Success</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Info className="size-6 text-blue-500" />
              <span className="text-muted text-[10px] font-bold uppercase">Info</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <AlertTriangle className="size-6 text-amber-500" />
              <span className="text-muted text-[10px] font-bold uppercase">Warning</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
