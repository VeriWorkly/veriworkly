"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageSquare } from "lucide-react";
import { TwitterXIcon, GithubIcon, LinkedInIcon } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

export function AffiliateFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-24 w-full px-6 pb-12">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-4xl border border-zinc-200/60 bg-white/60 p-10 shadow-sm backdrop-blur-md md:p-16 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-linear-to-bl from-blue-500/5 to-transparent blur-3xl" />

        <div className="grid gap-12 border-b border-zinc-200/60 pb-12 lg:grid-cols-12 dark:border-zinc-800/40">
          <div className="space-y-6 lg:col-span-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-zinc-200/10">
                <Image
                  src="/veriworkly-logo.png"
                  alt="VeriWorkly Logo"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="text-foreground font-mono text-xl font-semibold tracking-tight">
                VeriWorkly
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
              Empowering job seekers with the most advanced, privacy-first, and open-source resume
              building experience. 100% free, forever.
            </p>
          </div>

          <div className="flex items-center justify-start lg:col-span-7 lg:justify-end">
            <div className="text-muted-foreground flex w-fit items-center gap-2 rounded-full border border-zinc-200/50 bg-zinc-50 px-4 py-1.5 text-[10px] font-bold shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span>Operational</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 pt-12 md:grid-cols-4">
          <div className="space-y-4">
            <h5 className="text-foreground font-mono text-xs font-bold tracking-wider uppercase">
              Platform
            </h5>
            <ul className="text-muted-foreground space-y-2.5 text-xs">
              <li>
                <Link
                  href={siteConfig.links.app}
                  className="hover:text-foreground transition-colors"
                >
                  Resume Builder
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteConfig.links.app}/portfolio`}
                  className="hover:text-foreground transition-colors"
                >
                  Portfolio Builder
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-foreground transition-colors">
                  Core Features
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h5 className="text-foreground font-mono text-xs font-bold tracking-wider uppercase">
              Resources
            </h5>
            <ul className="text-muted-foreground space-y-2.5 text-xs">
              <li>
                <Link href="/templates" className="hover:text-foreground transition-colors">
                  Template Gallery
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground transition-colors">
                  FAQ & Help
                </Link>
              </li>
              <li>
                <Link href="/style-guide" className="hover:text-foreground transition-colors">
                  Design System
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-foreground transition-colors">
                  System Security
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h5 className="text-foreground font-mono text-xs font-bold tracking-wider uppercase">
              Company
            </h5>
            <ul className="text-muted-foreground space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  Our Mission
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className="hover:text-foreground transition-colors">
                  Product Roadmap
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Contact Team
                </Link>
              </li>
              <li>
                <Link href="/ambassador" className="hover:text-foreground transition-colors">
                  Ambassador Program
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h5 className="text-foreground font-mono text-xs font-bold tracking-wider uppercase">
              Socials
            </h5>
            <ul className="text-muted-foreground space-y-2.5 text-xs">
              <li>
                <Link
                  href={siteConfig.links.twitter}
                  target="_blank"
                  className="hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <TwitterXIcon className="h-3.5 w-3.5" />
                  X.com
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.links.github}
                  target="_blank"
                  className="hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.links.linkedin}
                  target="_blank"
                  className="hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <LinkedInIcon className="h-3.5 w-3.5" />
                  LinkedIn
                </Link>
              </li>
              <li>
                <Link
                  href="https://discord.gg/veriworkly"
                  target="_blank"
                  className="hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Discord
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-muted-foreground/80 mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 pt-6 text-[11px] font-semibold md:flex-row">
        <div>&copy; {currentYear} VeriWorkly</div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <button className="hover:text-foreground transition-colors">Cookie Preferences</button>
        </div>
      </div>
    </footer>
  );
}
