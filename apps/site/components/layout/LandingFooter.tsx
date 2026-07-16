"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export interface LandingFooterLink {
  name: string;
  href: string;
  external?: boolean;
}

export interface LandingFooterColumn {
  title: string;
  links: LandingFooterLink[];
}

export interface LandingFooterSocialLink {
  name: string;
  href: string;
  iconSrc: string;
}

export interface LandingFooterProps {
  shortName: string;
  headingPrefix?: string;
  ctaText?: string;
  ctaHref?: string;
  logoSrc: string;
  authorName?: string;
  socialLinks: LandingFooterSocialLink[];
  footerColumns: LandingFooterColumn[];
  navLinks: LandingFooterLink[];
  legalLinks: LandingFooterLink[];
}

export const LandingFooter = ({
  shortName,
  headingPrefix = "Are You Interested",
  ctaText = "Contact Sales",
  ctaHref = "#",
  logoSrc,
  authorName = "Gautam Raj",
  socialLinks,
  footerColumns,
  navLinks,
  legalLinks,
}: LandingFooterProps) => {
  return (
    <footer className="relative z-0 w-full overflow-hidden border-t border-black/5 bg-[#FAFAFA] pt-24 dark:border-white/5 dark:bg-[#0A0A0A]">
      {/* Soft gradient background matching reference (Peach/Pink blend) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-blue-50/50 to-blue-100/80 mix-blend-multiply dark:via-blue-900/10 dark:to-blue-900/20 dark:mix-blend-screen" />
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay dark:opacity-[0.02]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="container mx-auto max-w-7xl px-6 md:px-12">
        {/* Top Section */}
        <div className="mb-24 grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Left side: Heading & Button */}
          <div className="max-w-md">
            <h2 className="mb-8 text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-gray-900 md:text-5xl dark:text-white">
              {headingPrefix} <br /> With {shortName}?
            </h2>
            <Link
              href={ctaHref}
              className="group inline-flex items-center gap-3 rounded-full bg-[#171717] px-7 py-3.5 font-medium text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)] active:translate-y-0 active:scale-95 active:shadow-none dark:bg-white dark:text-[#171717] dark:shadow-[0_8px_20px_-6px_rgba(255,255,255,0.2)] dark:hover:shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]"
            >
              {ctaText}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Right side: Links Grid */}
          <div className="grid grid-cols-2 gap-8 pt-2 md:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h4 className="mb-6 font-semibold text-gray-900 dark:text-white">{column.title}</h4>
                <ul className="space-y-4">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noreferrer" : undefined}
                        className="group flex w-fit items-center gap-1.5 text-[15px] font-medium text-gray-500 transition-colors duration-300 ease-out hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      >
                        {link.name}
                        {link.external && (
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Section: Logo, Nav Pill, Socials */}
        <div className="mb-10 flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-md">
              <Image
                src={logoSrc}
                alt={`${shortName} Logo`}
                width={30}
                height={30}
                className="h-full w-full object-contain dark:invert"
              />
            </div>
            <span className="font-mono text-[1.35rem] font-bold tracking-tight text-gray-900 dark:text-white">
              {shortName}.
            </span>
          </div>

          {/* Pill Navigation */}
          {navLinks.length > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white/40 p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/20">
              {navLinks.map((link, index) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ease-out active:scale-95 ${
                    index === 0
                      ? "bg-white text-gray-900 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] dark:bg-white/10 dark:text-white"
                      : "text-gray-600 hover:bg-white/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          )}

          {/* Socials */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <Link
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/40 backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:border-black/20 hover:bg-white hover:shadow-sm active:translate-y-0 active:scale-95 dark:border-white/10 dark:bg-transparent dark:hover:bg-white/10"
              >
                <Image
                  src={social.iconSrc}
                  alt={social.name}
                  width={18}
                  height={18}
                  className="opacity-60 transition-opacity duration-300 group-hover:opacity-100 dark:invert"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mb-8 h-px w-full bg-black/5 dark:bg-white/10" />

        {/* Bottom Section */}
        <div className="relative z-10 flex flex-col items-center justify-between gap-4 pb-16 text-[13px] font-medium text-gray-500 md:flex-row md:pb-24 dark:text-gray-400">
          <p>
            © {shortName} by {authorName}
          </p>
          <div className="flex items-center gap-8">
            {legalLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="transition-colors duration-300 ease-out hover:text-gray-900 dark:hover:text-white"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Giant Watermark Text */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 flex w-full translate-y-[35%] justify-center overflow-hidden opacity-100 select-none dark:opacity-80"
        style={{
          WebkitMaskImage: "linear-gradient(to top, black 30%, transparent 100%)",
          maskImage: "linear-gradient(to top, black 30%, transparent 100%)",
        }}
      >
        <h1 className="text-[18vw] leading-none font-black tracking-tighter whitespace-nowrap text-gray-900/10 uppercase dark:text-white/10">
          {shortName}
        </h1>
      </div>
    </footer>
  );
};
