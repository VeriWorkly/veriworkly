"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Menu, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
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
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <nav className="border-line bg-paper/80 fixed top-4.5 left-1/2 z-90 flex h-16 w-[min(1160px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-5 rounded-full border pr-2.5 pl-4 font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] shadow-[0_14px_45px_rgba(17,17,15,0.08)] backdrop-blur-xl">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2.5 text-sm font-bold tracking-[-.04em]"
      >
        <Image
          src="/veriworkly-logo-128.png"
          width={28}
          height={28}
          alt="VeriWorkly Logo"
          priority
        />
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

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="border-line text-ink grid size-10 shrink-0 place-items-center rounded-full border sm:hidden"
        >
          <Menu size={17} aria-hidden="true" />
        </button>
      </div>

      {open && mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              className="bg-ink/45 fixed inset-0 z-100 backdrop-blur-sm sm:hidden"
              onMouseDown={() => setOpen(false)}
            >
              <div
                className="bg-paper border-line absolute top-4 right-4 left-4 rounded-3xl border p-5 shadow-[0_20px_60px_rgba(17,17,15,0.18)]"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 text-sm font-bold tracking-[-.04em]"
                  >
                    <Image
                      src="/veriworkly-logo-128.png"
                      width={26}
                      height={26}
                      alt="VeriWorkly Logo"
                    />
                    <span className="text-ink">VeriWorkly</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="border-line text-ink grid size-9 place-items-center rounded-full border"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-6 flex flex-col gap-1">
                  {showPricing && (
                    <Link
                      href="/pricing"
                      onClick={() => setOpen(false)}
                      className="text-ink hover:bg-paper-2 rounded-xl px-3 py-3 text-sm font-bold transition"
                    >
                      Pricing
                    </Link>
                  )}

                  <Link
                    href="/faq"
                    onClick={() => setOpen(false)}
                    className="text-ink hover:bg-paper-2 rounded-xl px-3 py-3 text-sm font-bold transition"
                  >
                    FAQ
                  </Link>
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="bg-ink hover:bg-ink-soft text-paper mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-all duration-200 active:scale-[0.97]"
                >
                  Start building <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>,
            document.body,
          )
        : null}
    </nav>
  );
};

export default TemplatesNavigation;
