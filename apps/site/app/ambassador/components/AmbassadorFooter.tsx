"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
export function AmbassadorFooter() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const columns = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/features" },
        { label: "Pricing", href: "/pricing" },
        { label: "Integrations", href: "/integrations" },
        { label: "Changelog", href: "/changelog" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "Tutorials", href: "/tutorials" },
        { label: "Blog", href: "/blog" },
        { label: "Support", href: "/support" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
        { label: "Partners", href: "/partners" },
      ],
    },
  ];

  return (
    <footer className="bg-background text-zinc-550 relative w-full overflow-hidden border-t border-zinc-200/80 pt-24 pb-12 text-xs transition-colors duration-300 dark:border-white/10 dark:text-zinc-400">
      {/* Giant Background Watermark Text (Faint display watermark spanning the bottom behind other layers) */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-0 w-full -translate-x-1/2 overflow-hidden text-center select-none">
        <span className="block translate-y-[20%] text-[12vw] leading-none font-black tracking-tighter text-zinc-950/[0.02] uppercase dark:text-white/[0.015]">
          VeriWorkly
        </span>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-16 px-6">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_1.2fr]">
          {/* Left Column: Brand, Tagline & Socials */}
          <div className="space-y-6">
            {/* Logo and Brand Text */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg border border-zinc-200/50 bg-zinc-100 dark:border-white/10 dark:bg-white/5">
                <Image
                  src="/veriworkly-logo.png"
                  alt="VeriWorkly Logo"
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </div>
              <span className="font-mono text-sm font-semibold tracking-tight text-zinc-950 dark:text-white">
                VeriWorkly
              </span>
            </div>

            {/* Tagline */}
            <p className="max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              VeriWorkly is a privacy-first career workspace for building resumes, cover letters,
              and public portfolios.
            </p>

            {/* Social Icons */}
            <div className="flex gap-4">
              <a
                href="https://github.com/veriworkly"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 transition-colors duration-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white"
                aria-label="GitHub"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/company/veriworkly"
                target="_blank"
                rel="noreferrer"
                className="dark:text-zinc-505 text-zinc-400 transition-colors duration-200 hover:text-zinc-900 dark:hover:text-white"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="https://twitter.com/veriworkly"
                target="_blank"
                rel="noreferrer"
                className="dark:text-zinc-505 text-zinc-400 transition-colors duration-200 hover:text-zinc-900 dark:hover:text-white"
                aria-label="Twitter"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/veriworkly"
                target="_blank"
                rel="noreferrer"
                className="dark:text-zinc-505 text-zinc-400 transition-colors duration-200 hover:text-zinc-900 dark:hover:text-white"
                aria-label="Instagram"
              >
                <svg
                  className="h-4 w-4 fill-none stroke-current"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right Column: Dynamic stacked link grids */}
          <div className="grid grid-cols-3 gap-8">
            {columns.map((col) => (
              <div key={col.title} className="space-y-4">
                <h4 className="text-[10px] font-black tracking-wider text-zinc-950 uppercase dark:text-white">
                  {col.title}
                </h4>
                <ul className="space-y-2.5 font-medium text-zinc-500 dark:text-zinc-400">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="transition-colors duration-200 hover:text-zinc-950 dark:hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Metadata Line */}
        <div className="text-zinc-450 flex flex-col items-center justify-between gap-6 border-t border-zinc-200 pt-8 text-[10px] font-bold tracking-wider uppercase md:flex-row dark:border-white/10 dark:text-zinc-500">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 rounded-full border border-zinc-200/60 bg-zinc-50 px-3 py-1 shadow-inner dark:border-white/10 dark:bg-zinc-900/40">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            <span>All systems operational</span>
          </div>

          {/* Copyright & Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span>&copy; {currentYear} VeriWorkly. All rights reserved.</span>
            <Link
              href="/privacy"
              className="transition-colors duration-200 hover:text-zinc-950 dark:hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-zinc-955 transition-colors duration-200 dark:hover:text-white"
            >
              Terms of Use
            </Link>
            <Link
              href="/cookies"
              className="hover:text-zinc-955 transition-colors duration-200 dark:hover:text-white"
            >
              Cookie Settings
            </Link>
          </div>

          {/* Top Scroll button */}
          <div>
            <button
              onClick={scrollToTop}
              className="text-zinc-955 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 shadow-xs transition-all hover:border-zinc-900 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
