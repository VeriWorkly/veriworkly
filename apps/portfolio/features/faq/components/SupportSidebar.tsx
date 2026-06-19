"use client";

import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

const SupportSidebar = () => {
  return (
    <div className="space-y-6 lg:sticky lg:top-28">
      <div className="border-line bg-panel rounded-3xl border p-6 shadow-[0_15px_30px_rgba(17,17,15,0.02)]">
        <h3 className="text-ink text-lg font-bold tracking-[-0.02em]">Still have questions?</h3>

        <p className="text-muted mt-3 text-xs leading-6">
          We are here to help you showcase your career and projects perfectly. Reach out anytime.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="mailto:support@veriworkly.com"
            className="group border-line bg-paper/40 hover:bg-paper-2 text-ink flex items-center justify-between rounded-2xl border p-4 text-xs font-bold uppercase transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <div className="flex items-center gap-3">
              <Mail className="text-accent size-4 transition-transform group-hover:scale-110" />
              <span>Email Support</span>
            </div>

            <ArrowRight className="text-muted size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* <Link
            target="_blank"
            rel="noreferrer"
            href="https://discord.gg/veriworkly"
            className="group border-line bg-paper/40 hover:bg-paper-2 text-ink flex items-center justify-between rounded-2xl border p-4 text-xs font-bold uppercase transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="text-accent size-4 transition-transform group-hover:scale-110" />
              <span>Join Discord</span>
            </div>

            <ArrowRight className="text-muted size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link> */}
        </div>
      </div>

      <div className="border-line-strong bg-accent rounded-3xl border p-6 text-white shadow-[8px_10px_0_rgba(37,99,235,0.1)]">
        <p className="text-[10px] font-bold tracking-[0.16em] text-white/80 uppercase">
          Continuous Updates
        </p>

        <h4 className="mt-2 text-base leading-snug font-bold">
          Built on unified, modular career profiles.
        </h4>

        <p className="mt-3 text-xs leading-relaxed text-white/80">
          Update your background, links, or visual layout at any time. Your portfolio builds
          directly on top of your resume data.
        </p>

        <Link
          href="/dashboard"
          className="text-accent hover:bg-paper-2 mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold tracking-wide uppercase transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          Go to Dashboard <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};

export default SupportSidebar;
