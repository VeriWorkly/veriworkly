"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";

import type { MarketingNavItem, MarketingSimpleLink } from "./types";

import { cn } from "../../../utils";

import { Button } from "../../ui/Button";

import { Container } from "../Container";
import { GithubIcon } from "../social/SocialIcons";
import { ThemeToggle } from "../theme/ThemeToggle";

interface MarketingMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  items: MarketingNavItem[];
  resourceLinks: MarketingSimpleLink[];
  legalLinks: MarketingSimpleLink[];
  githubHref: string;
  appHref: string;
  ctaLabel?: string;
  footerNote?: string;
}

export const MarketingMobileNav = ({
  isOpen,
  onClose,
  items,
  resourceLinks,
  legalLinks,
  githubHref,
  appHref,
  ctaLabel = "Start Building Free",
  footerNote = "No login required | Free forever",
}: MarketingMobileNavProps) => {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "bg-background fixed inset-0 z-90 flex h-screen w-full flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.85,0,0.15,1)] lg:hidden",
        isOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
      )}
    >
      <div className="bg-accent/10 pointer-events-none absolute top-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full blur-[120px]" />

      <Container className="flex h-full flex-col overflow-x-hidden overflow-y-auto px-4 pt-28 pb-10">
        <div className="flex-1 space-y-8">
          <div>
            <p className="text-accent mb-4 text-xs font-black tracking-[0.3em] uppercase opacity-70">
              Navigation
            </p>

            <div className="grid gap-2">
              {items.map((item, i) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center justify-between rounded-2xl px-4 py-4 transition-all duration-300",
                    pathname === item.href
                      ? "bg-accent/10 text-foreground"
                      : "text-muted hover:bg-accent/5 hover:text-foreground",
                  )}
                  style={{
                    transitionDelay: `${i * 40}ms`,
                    transform: isOpen ? "translateY(0)" : "translateY(20px)",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "border-border/40 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        pathname === item.href
                          ? "bg-accent border-accent/20 text-white"
                          : "bg-accent/5",
                      )}
                    >
                      <item.icon className="h-6 w-6" />
                    </div>

                    <span className="text-xl font-bold tracking-tight">{item.name}</span>
                  </div>

                  <ArrowRight
                    className={cn(
                      "h-5 w-5 transition-all duration-300",
                      pathname === item.href
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-4 opacity-0",
                    )}
                  />
                </Link>
              ))}
            </div>
          </div>

          <div
            className="border-border/40 grid grid-cols-2 gap-6 border-t pt-8"
            style={{
              transitionDelay: "250ms",
              transform: isOpen ? "translateY(0)" : "translateY(20px)",
              opacity: isOpen ? 1 : 0,
            }}
          >
            <div className="space-y-3">
              <p className="text-muted text-[10px] font-black tracking-[0.2em] uppercase">
                Resources
              </p>

              <div className="flex flex-col gap-2">
                {resourceLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={onClose}
                    className="text-muted hover:text-foreground text-sm font-medium transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-muted text-[10px] font-black tracking-[0.2em] uppercase">Legal</p>

              <div className="flex flex-col gap-2">
                {legalLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={onClose}
                    className="text-muted hover:text-foreground text-sm font-medium transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-10 space-y-6"
          style={{
            transitionDelay: "350ms",
            transform: isOpen ? "translateY(0)" : "translateY(20px)",
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="bg-accent/5 border-border/40 flex items-center justify-between gap-4 rounded-3xl border p-4">
            <div className="flex items-center gap-4">
              <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-full">
                <ThemeToggle />
              </div>

              <div>
                <p className="text-sm font-bold">Theme Appearance</p>
                <p className="text-muted text-[10px] font-medium">Switch between light & dark</p>
              </div>
            </div>

            <div className="bg-border/40 h-4 w-px" />

            <Link
              target="_blank"
              href={githubHref}
              onClick={onClose}
              className="text-muted hover:text-foreground flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            >
              <GithubIcon className="h-5 w-5" />
            </Link>
          </div>

          <Button
            asChild
            onClick={onClose}
            className="bg-foreground text-background shadow-foreground/5 h-16 w-full rounded-2xl text-lg font-black shadow-xl"
          >
            <Link href={appHref}>{ctaLabel}</Link>
          </Button>

          <p className="text-center text-[10px] font-bold tracking-widest uppercase opacity-40">
            {footerNote}
          </p>
        </div>
      </Container>
    </div>
  );
};
