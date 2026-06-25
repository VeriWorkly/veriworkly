import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const TemplatesNavigation = ({
  backHref,
  backLabel,
  showPricing = false,
}: {
  backHref: string;
  backLabel: string;
  showPricing?: boolean;
}) => {
  return (
    <nav className="border-line bg-paper/80 fixed top-4.5 left-1/2 z-90 flex h-16 w-[min(1160px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-5 rounded-full border pr-2.5 pl-4 font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] shadow-[0_14px_45px_rgba(17,17,15,0.08)] backdrop-blur-xl">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2.5 text-sm font-bold tracking-[-.04em]"
      >
        <Image src="/veriworkly-logo.png" width={28} height={28} alt="VeriWorkly Logo" priority />
        <span className="text-ink hidden min-[380px]:inline">VeriWorkly Portfolio</span>
        <span className="text-ink inline min-[380px]:hidden">VeriWorkly</span>
      </Link>

      <div className="flex items-center gap-4 text-xs font-bold sm:gap-6">
        {showPricing && (
          <Link
            className="text-ink/75 hover:text-accent hidden py-1 transition duration-200 sm:inline"
            href="/pricing"
          >
            Pricing
          </Link>
        )}

        <Link
          className="text-ink/75 hover:text-accent hidden py-1 transition duration-200 sm:inline"
          href="/faq"
        >
          FAQ
        </Link>

        <Link
          href={backHref}
          className="text-ink/75 hover:text-accent flex items-center gap-1.5 py-1 transition duration-200"
        >
          <ArrowLeft size={13} /> {backLabel}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/dashboard"
          className="bg-ink hover:bg-ink-soft text-paper hidden min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] sm:inline-flex"
        >
          Start building <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
};

export default TemplatesNavigation;
