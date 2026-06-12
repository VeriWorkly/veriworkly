import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { TemplateSummary } from "@/templates/catalog/templates";

import { templatesShell } from "../constants";

export function TemplateCta({ template }: { template: TemplateSummary }) {
  return (
    <section className={`${templatesShell} py-24`}>
      <div className="grid gap-8 rounded-4xl border-2 border-[#11110f] bg-white p-8 shadow-[14px_16px_0_rgba(37,99,235,0.12)] lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-accent text-xs font-black tracking-[0.16em] uppercase">Ready to build</p>
          <h2 className="mt-4 max-w-3xl text-[clamp(2.5rem,5vw,5rem)] leading-[0.88] font-black tracking-[-0.08em]">
            Start with {template.name}, then switch anytime.
          </h2>
        </div>
        <Link
          className="bg-accent inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-white transition duration-300 hover:-translate-y-1"
          href="/dashboard"
        >
          Create my portfolio <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
