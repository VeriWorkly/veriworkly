"use client";

import * as React from "react";
import { X, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "../../../utils";

import { Container } from "../Container";

interface MarketingNavbarProps {
  logo: React.ReactNode;
  desktopNav: React.ReactNode;
  actions: React.ReactNode;
  mobileNav: (props: { isOpen: boolean; onClose: () => void }) => React.ReactNode;
}

export const MarketingNavbar = ({ logo, desktopNav, actions, mobileNav }: MarketingNavbarProps) => {
  const pathname = usePathname();

  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuPath, setMobileMenuPath] = React.useState<string | null>(null);

  const isOpen = mobileMenuPath === pathname;

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 right-0 left-0 z-100 transition-all duration-300",
          scrolled || isOpen
            ? "border-border/40 bg-background/95 border-b py-3 backdrop-blur-xl"
            : "bg-transparent py-5",
        )}
      >
        <Container>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-10">
              {logo}
              {desktopNav}
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {actions}

              <button
                aria-label="Toggle menu"
                onClick={() => setMobileMenuPath((prev) => (prev === pathname ? null : pathname))}
                className="text-muted hover:text-foreground bg-accent/5 relative z-110 flex h-11 w-11 items-center justify-center rounded-xl transition-all active:scale-90 lg:hidden"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </Container>
      </nav>

      {mobileNav({ isOpen, onClose: () => setMobileMenuPath(null) })}
    </>
  );
};
