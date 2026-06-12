import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { templatesShell } from "../constants";

export function TemplatesNavigation({
  backHref,
  backLabel,
  showPricing = false,
}: {
  backHref: string;
  backLabel: string;
  showPricing?: boolean;
}) {
  return (
    <nav className={`${templatesShell} flex min-h-[82px] items-center justify-between gap-4`}>
      <Link className="flex items-center gap-3 text-sm font-black tracking-[-.04em]" href="/">
        <Image src="/veriworkly-logo.png" width={28} height={28} alt="VeriWorkly Logo" />
        VeriWorkly Portfolio
      </Link>
      <div className="flex items-center gap-5 text-sm font-black">
        {showPricing && (
          <Link className="hidden sm:inline" href="/pricing">
            Pricing
          </Link>
        )}
        <Link className="flex items-center gap-2" href={backHref}>
          <ArrowLeft size={14} /> {backLabel}
        </Link>
        <Link
          className="bg-accent hidden min-h-10 items-center justify-center rounded-full px-4 text-xs font-black text-white sm:inline-flex"
          href="/dashboard"
        >
          Start building
        </Link>
      </div>
    </nav>
  );
}
