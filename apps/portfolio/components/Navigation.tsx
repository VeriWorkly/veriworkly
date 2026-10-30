"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

const Navigation = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Close the mobile menu on route change. Adjusting state during render
  // (rather than in an effect) avoids the extra commit-then-re-render pass
  // an effect-based reset would cause — this is the pattern React's own
  // docs recommend for "reset state when a prop changes".
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // A modal dialog: focus moves into it, Tab stays inside it, and closing it returns focus to
  // the button that opened it.
  useEffect(() => {
    if (!open) return;
    const menuButton = menuButtonRef.current;
    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []);

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panelRef.current?.contains(document.activeElement);

      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      menuButton?.focus();
    };
  }, [open]);

  const isLinkActive = (path: string) => {
    if (path === "/") return pathname === "/";

    return pathname?.startsWith(path);
  };

  const linkClass = (path: string) =>
    `relative text-xs font-bold transition duration-200 py-1 ${
      isLinkActive(path) ? "text-accent" : "text-ink/75 hover:text-accent"
    }`;

  return (
    <nav className="border-line bg-paper/80 fixed top-4.5 left-1/2 z-90 flex h-16 w-[min(1160px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-5 rounded-full border pr-2.5 pl-4 shadow-[0_14px_45px_rgba(17,17,15,0.08)] backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2.5 text-sm font-bold tracking-[-.04em]">
        <Image src="/veriworkly-logo-128.png" width={28} height={28} alt="" priority />
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
          className="bg-ink hover:bg-ink-soft text-paper hidden min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] md:inline-flex"
        >
          Start building <ArrowRight size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          ref={menuButtonRef}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="border-line text-ink grid size-10 shrink-0 place-items-center rounded-full border md:hidden"
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
              className="bg-ink/45 fixed inset-0 z-100 backdrop-blur-sm md:hidden"
              onMouseDown={() => setOpen(false)}
            >
              <div
                className="bg-paper border-line absolute top-4 right-4 left-4 rounded-3xl border p-5 shadow-[0_20px_60px_rgba(17,17,15,0.18)]"
                ref={panelRef}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 text-sm font-bold tracking-[-.04em]"
                  >
                    <Image src="/veriworkly-logo-128.png" width={26} height={26} alt="" />
                    <span className="text-ink">VeriWorkly Portfolio</span>
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
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                        isLinkActive(link.href)
                          ? "bg-accent-soft text-accent"
                          : "text-ink hover:bg-paper-2"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
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

export default Navigation;
