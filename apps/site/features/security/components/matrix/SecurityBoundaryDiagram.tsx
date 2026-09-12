"use client";

import { useState } from "react";
import { Globe2, Lock, ShieldCheck, Cpu, CheckCircle2 } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

interface SecurityLayer {
  id: string;
  title: string;
  badge: string;
  badgeTone: string;
  detail: string;
  icon: typeof Lock;
  specs: string[];
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

const layers: SecurityLayer[] = [
  {
    id: "browser-sandbox",
    title: "1. Browser Local Sandbox",
    badge: "100% Offline Capable",
    badgeTone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    detail:
      "Your documents compile in-browser using vector rendering. Zero telemetry on your keystrokes.",
    icon: Lock,
    specs: [
      "Client-side LocalStorage encryption",
      "In-browser PDF & DOCX vector compiler",
      "Zero unauthenticated remote uploads",
      "1-click local JSON backup export",
    ],
    colorClass: "text-blue-500",
    borderClass: "border-blue-500/30",
    bgClass: "bg-blue-500/10",
  },
  {
    id: "cloud-sync",
    title: "2. Encrypted Cloud Sync",
    badge: "Optional Opt-In",
    badgeTone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    detail:
      "When you log in, your Master Profile syncs over TLS 1.3 with passwordless OTP verification.",
    icon: ShieldCheck,
    specs: [
      "Better Auth passwordless OTP login",
      "AES-256 at rest & TLS 1.3 in transit",
      "Isolated multi-tenant data partitioning",
      "Full account & document deletion on demand",
    ],
    colorClass: "text-emerald-500",
    borderClass: "border-emerald-500/30",
    bgClass: "bg-emerald-500/10",
  },
  {
    id: "edge-portfolios",
    title: "3. Edge Subdomain Routing",
    badge: "Zero Cookies",
    badgeTone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    detail:
      "Published web portfolios are distributed across global CDN edges with automatic SSL/TLS.",
    icon: Globe2,
    specs: [
      "Custom subdomain routing (yourname.veriworkly.com)",
      "Aggregate-only analytics without tracker cookies",
      "Instant password protection & unpublish toggle",
      "Automatic SSL certificate provisioning",
    ],
    colorClass: "text-purple-500",
    borderClass: "border-purple-500/30",
    bgClass: "bg-purple-500/10",
  },
  {
    id: "ai-privacy",
    title: "4. AI Privacy Shield",
    badge: "Named Subprocessor",
    badgeTone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    detail:
      "We keep no copy of AI request text after a request completes, and our provider terms prohibit training on it. The Privacy Policy names every AI subprocessor.",
    icon: Cpu,
    specs: [
      "AI request text not retained by VeriWorkly",
      "Provider terms prohibit training on your text",
      "Side-by-side diff review before applying changes",
      "Encrypted API gateway with rate-limiting",
    ],
    colorClass: "text-amber-500",
    borderClass: "border-amber-500/30",
    bgClass: "bg-amber-500/10",
  },
];

export const SecurityBoundaryDiagram = () => {
  const [activeLayerId, setActiveLayerId] = useState<string>("browser-sandbox");

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0];
  const ActiveIcon = activeLayer.icon;

  return (
    <div className="border-border/60 bg-card/60 relative overflow-hidden rounded-3xl border p-6 shadow-2xl backdrop-blur-md sm:p-8">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.2]" />
      <div className="bg-accent/10 pointer-events-none absolute -top-10 -right-10 size-60 rounded-full blur-3xl" />

      <div className="space-y-6">
        <div className="border-border/40 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-accent/15 text-accent ring-accent/30 flex size-8 items-center justify-center rounded-lg ring-1">
              <Lock className="size-4" />
            </span>

            <div>
              <h3 className="text-foreground text-sm font-bold">
                Security &amp; Privacy Boundary Matrix
              </h3>

              <p className="text-muted text-[11px]">Interactive multi-layered architecture</p>
            </div>
          </div>

          <span className="border-border/60 bg-background/80 text-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Isolated Sandboxes
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {layers.map((layer) => {
            const Icon = layer.icon;
            const isActive = layer.id === activeLayerId;

            return (
              <button
                type="button"
                key={layer.id}
                onClick={() => setActiveLayerId(layer.id)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all duration-200 ${
                  isActive
                    ? "border-accent bg-accent/10 shadow-sm"
                    : "border-border/50 bg-background/50 hover:border-border hover:bg-background/80 text-muted"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon className={`size-4 ${isActive ? layer.colorClass : "text-muted"}`} />
                  {isActive && <span className="bg-accent size-1.5 animate-ping rounded-full" />}
                </div>

                <span
                  className={`text-xs font-bold ${isActive ? "text-foreground" : "text-muted"}`}
                >
                  {layer.title.split(". ")[1]}
                </span>
              </button>
            );
          })}
        </div>

        <Reveal key={activeLayer.id} className="space-y-4">
          <div
            className={`rounded-2xl border p-5 backdrop-blur-sm sm:p-6 ${activeLayer.borderClass} ${activeLayer.bgClass}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`bg-background flex size-10 items-center justify-center rounded-xl shadow-xs ${activeLayer.colorClass}`}
                >
                  <ActiveIcon className="size-5" />
                </span>

                <div>
                  <h4 className="text-foreground text-base font-bold">{activeLayer.title}</h4>
                  <p className="text-muted text-xs leading-relaxed">{activeLayer.detail}</p>
                </div>
              </div>

              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${activeLayer.badgeTone}`}
              >
                {activeLayer.badge}
              </span>
            </div>

            <div className="border-border/40 mt-5 grid gap-2 border-t pt-2 sm:grid-cols-2">
              {activeLayer.specs.map((spec) => (
                <div key={spec} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className={`size-3.5 shrink-0 ${activeLayer.colorClass}`} />
                  <span className="text-foreground/90 font-medium">{spec}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[10px]">
          <div className="border-border/40 bg-background/50 text-muted rounded-xl border p-2">
            <span className="text-foreground block font-bold">0 Trackers</span>
            <span>Zero ad pixels</span>
          </div>

          <div className="border-border/40 bg-background/50 text-muted rounded-xl border p-2">
            <span className="block font-bold text-emerald-500">MIT Core</span>
            <span>Auditable source</span>
          </div>

          <div className="border-border/40 bg-background/50 text-muted rounded-xl border p-2">
            <span className="text-accent block font-bold">24h SLA</span>
            <span>Security response</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityBoundaryDiagram;
