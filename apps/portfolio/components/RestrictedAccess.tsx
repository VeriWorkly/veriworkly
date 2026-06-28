"use client";

import Link from "next/link";
import { Lock, ArrowLeft, ArrowRight, AppWindow } from "lucide-react";

import { siteConfig, veriworklyProductLinks } from "@/config/site";

export function RestrictedAccess() {
  return (
    <main className="text-ink-2 selection:bg-accent selection:text-accent-ink bg-paper relative flex min-h-dvh flex-col items-center justify-center overflow-x-clip px-6 py-12">
      <div className="bg-accent/10 pointer-events-none absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-ink)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-[0.06]" />

      <div className="border-line bg-panel relative z-10 w-full max-w-lg rounded-3xl border p-8 text-center shadow-lg md:p-12">
        <div className="border-line-strong bg-paper mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm">
          <Lock className="text-accent h-7 w-7" />
        </div>

        <h1 className="text-ink mt-8 text-3xl font-bold tracking-tight">Private Preview Mode</h1>

        <p className="text-muted mt-4 text-sm leading-relaxed">
          The VeriWorkly Portfolio Builder is currently in active development. To guarantee platform
          stability and design refinement, production access is restricted to administrators.
        </p>

        <div className="border-line bg-paper/50 mt-8 rounded-2xl border p-5 text-left">
          <h2 className="text-ink flex items-center gap-2 text-sm font-semibold">
            <AppWindow className="text-accent h-4 w-4" /> What can I do?
          </h2>
          <ul className="text-muted mt-3 space-y-2.5 text-xs font-medium">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>Visit published portfolios (e.g. template examples)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>Access public pages like templates, FAQ, and pricing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>Manage your resumes and document tools in VeriWorkly Studio</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={veriworklyProductLinks.studio}
            className="bg-accent hover:bg-accent-strong flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-md transition-colors duration-200"
          >
            Go to VeriWorkly Studio <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href={siteConfig.links.main}
            className="border-line text-ink-soft hover:bg-paper-2 flex items-center justify-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-bold transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
