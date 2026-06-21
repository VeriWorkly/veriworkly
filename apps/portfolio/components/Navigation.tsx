"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeToggle";

const Navigation = () => {
  const pathname = usePathname();

  const isLinkActive = (path: string) => {
    if (path === "/") return pathname === "/";

    return pathname?.startsWith(path);
  };

  const linkClass = (path: string) =>
    `relative text-xs font-bold transition duration-200 py-1 ${
      isLinkActive(path) ? "text-accent" : "text-ink/75 hover:text-accent"
    }`;

  return (
    <nav className="border-line bg-paper/80 fixed top-4.5 left-1/2 z-90 flex h-16 w-[min(1160px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-5 rounded-full border pr-2.5 pl-4 font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] shadow-[0_14px_45px_rgba(17,17,15,0.08)] backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2.5 text-sm font-bold tracking-[-.04em]">
        <Image src="/veriworkly-logo.png" width={28} height={28} alt="VeriWorkly Logo" priority />
        <span className="text-ink">VeriWorkly Portfolio</span>
      </Link>

      <div className="hidden items-center gap-7 text-xs font-bold md:flex">
        <Link href="/templates" className={linkClass("/templates")}>
          Templates
          {isLinkActive("/templates") && (
            <span className="bg-accent absolute right-0 bottom-0 left-0 h-0.5 rounded-full" />
          )}
        </Link>

        <Link href="/pricing" className={linkClass("/pricing")}>
          Pricing
          {isLinkActive("/pricing") && (
            <span className="bg-accent absolute right-0 bottom-0 left-0 h-0.5 rounded-full" />
          )}
        </Link>

        <Link href="/faq" className={linkClass("/faq")}>
          FAQ
          {isLinkActive("/faq") && (
            <span className="bg-accent absolute right-0 bottom-0 left-0 h-0.5 rounded-full" />
          )}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <Link
          href="/dashboard"
          className="bg-ink hover:bg-ink-soft text-paper inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          Start building <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
