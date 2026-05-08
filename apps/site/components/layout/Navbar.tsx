"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ArrowUpRight,
  LayoutGrid,
  Map,
  Terminal,
  Newspaper,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { GithubIcon } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

import { siteConfig } from "@/config/site";
import { Container, Button, cn } from "@veriworkly/ui";

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent scrolling when mobile menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close mobile nav on route change during render to avoid cascading effects
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (isOpen) setIsOpen(false);
  }

  const navigation = [
    { name: "Templates", href: "/templates", icon: LayoutGrid },
    { name: "Roadmap", href: "/roadmap", icon: Map },
    { name: "Development", href: "/stats", icon: Terminal },
    { name: "Blog", href: "https://blogs.veriworkly.com", external: true, icon: Newspaper },
    { name: "Docs", href: "https://docs.veriworkly.com", external: true, icon: BookOpen },
  ];

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-100 transition-all duration-300",
          scrolled || isOpen
            ? "border-border/40 bg-background/95 border-b backdrop-blur-xl py-3"
            : "bg-transparent py-5",
        )}
      >
        <Container>
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-10">
              <Link
                href="/"
                className="group flex items-center gap-3 transition-all active:scale-95"
              >
                <div className="relative h-10 w-10 shrink-0">
                  <Image
                    src="/veriworkly-logo.png"
                    alt="VeriWorkly Logo"
                    width={40}
                    height={40}
                    priority
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="text-2xl font-bold tracking-tight">{siteConfig.shortName}</span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden items-center gap-1 lg:flex">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className={cn(
                      "text-muted hover:text-foreground relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-accent/5",
                      pathname === item.href && "text-foreground bg-accent/10",
                    )}
                  >
                    <span>{item.name}</span>
                    {item.external && (
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden lg:flex items-center gap-4">
                <Link
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-foreground flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent/5"
                >
                  <GithubIcon className="h-5 w-5" />
                </Link>

                <ThemeToggle />

                <Button
                  asChild
                  variant="primary"
                  className="rounded-full px-7 font-bold shadow-lg shadow-accent/10 transition-all hover:shadow-accent/20 active:scale-95"
                >
                  <Link href={siteConfig.links.app}>Start Building</Link>
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-muted hover:text-foreground relative z-110 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/5 transition-all active:scale-90 lg:hidden"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </Container>
      </nav>

      {/* Mobile Nav Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-90 flex h-screen w-full flex-col overflow-hidden bg-background transition-all duration-500 ease-[cubic-bezier(0.85,0,0.15,1)] lg:hidden",
          isOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        )}
      >
        <div className="bg-accent/10 absolute top-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full blur-[120px] pointer-events-none" />

        <Container className="flex h-full flex-col px-4 pt-28 pb-10 overflow-y-auto overflow-x-hidden">
          <div className="flex-1 space-y-8">
            <div>
              <p className="text-accent mb-4 text-xs font-black tracking-[0.3em] uppercase opacity-70">
                Navigation
              </p>
              <div className="grid gap-2">
                {navigation.map((item, i) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between rounded-2xl py-4 px-4 transition-all duration-300",
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
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/40 transition-colors",
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
              className="grid grid-cols-2 gap-6 border-t border-border/40 pt-8"
              style={{
                transitionDelay: "250ms",
                transform: isOpen ? "translateY(0)" : "translateY(20px)",
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="space-y-3">
                <p className="text-[10px] font-black tracking-[0.2em] text-muted uppercase">
                  Resources
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/faq"
                    className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Help Center
                  </Link>
                  <Link
                    href="/security"
                    className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Security
                  </Link>
                  <Link
                    href="/style-guide"
                    className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Brand assets
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black tracking-[0.2em] text-muted uppercase">
                  Legal
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/privacy"
                    className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/terms"
                    className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
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
            <div className="flex items-center justify-between gap-4 rounded-3xl bg-accent/5 p-4 border border-border/40">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-accent/10">
                  <ThemeToggle />
                </div>
                <div>
                  <p className="text-sm font-bold">Theme Appearance</p>
                  <p className="text-[10px] text-muted font-medium">Switch between light & dark</p>
                </div>
              </div>
              <div className="h-4 w-px bg-border/40" />
              <Link
                href={siteConfig.links.github}
                target="_blank"
                className="text-muted hover:text-foreground h-10 w-10 flex items-center justify-center rounded-full transition-colors"
              >
                <GithubIcon className="h-5 w-5" />
              </Link>
            </div>

            <Button
              asChild
              className="w-full h-16 rounded-2xl bg-foreground text-background text-lg font-black shadow-xl shadow-foreground/5"
            >
              <Link href={siteConfig.links.app}>Start Building Free</Link>
            </Button>
            <p className="text-center text-[10px] font-bold tracking-widest uppercase opacity-40">
              No login required • Free forever
            </p>
          </div>
        </Container>
      </div>
    </>
  );
};

export default Navbar;
