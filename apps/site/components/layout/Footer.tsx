import Link from "next/link";
import Image from "next/image";

import { Heart, Mail, MapPin, ArrowUpRight } from "lucide-react";
import { GithubIcon, LinkedInIcon, TwitterXIcon } from "./SocialIcons";

import { siteConfig } from "@/config/site";
import { Container } from "@veriworkly/ui";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: "Platform",
      links: [
        { name: "Resume Builder", href: siteConfig.links.app, external: true },
        { name: "Template Gallery", href: "/templates" },
        { name: "Product Roadmap", href: "/roadmap" },
        { name: "GitHub Activity", href: "/stats" },
        { name: "Release Notes", href: "/roadmap/done" },
      ],
    },
    {
      title: "Resources",
      links: [
        { name: "Docs & APIs", href: "https://docs.veriworkly.com", external: true },
        { name: "Engineering Blog", href: "https://blogs.veriworkly.com", external: true },
        { name: "System Security", href: "/security" },
        { name: "Design System", href: "/style-guide" },
        { name: "FAQ & Help", href: "/faq" },
      ],
    },
    {
      title: "Organization",
      links: [
        { name: "Our Mission", href: "/about" },
        { name: "Open Source", href: siteConfig.links.github, external: true },
        { name: "Privacy Policy", href: "/privacy" },
        { name: "Terms of Use", href: "/terms" },
        { name: "Contact Team", href: "/contact" },
      ],
    },
  ];

  return (
    <footer className="border-border/40 relative mt-12 overflow-hidden border-t bg-zinc-50/80 pt-20 pb-10 dark:bg-zinc-950/80">
      {/* Decorative Gradients */}
      <div className="bg-accent/10 pointer-events-none absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full blur-[120px]" />
      <div className="bg-accent/5 pointer-events-none absolute -top-48 -right-48 h-[500px] w-[500px] rounded-full blur-[120px]" />

      <Container className="relative">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8">
          {/* Brand Info */}
          <div className="space-y-8 lg:col-span-4">
            <div className="space-y-6">
              <Link href="/" className="group flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-md transition-transform group-hover:scale-110">
                  <Image
                    src="/veriworkly-logo.png"
                    alt="VeriWorkly Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-2xl font-bold tracking-tight">{siteConfig.shortName}</span>
              </Link>

              <p className="text-muted max-w-sm text-base leading-relaxed">
                Empowering job seekers with the most advanced, privacy-first, and open-source resume
                building experience. 100% free, forever.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="bg-accent/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <Mail className="h-4 w-4 text-accent" />
                </div>
                hello@veriworkly.com
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="bg-accent/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <MapPin className="h-4 w-4 text-accent" />
                </div>
                Open Source Everywhere
              </div>
            </div>

            <div className="flex gap-3">
              {[
                { name: "GitHub", href: siteConfig.links.github, icon: GithubIcon },
                { name: "Twitter", href: siteConfig.links.twitter, icon: TwitterXIcon },
                { name: "LinkedIn", href: siteConfig.links.linkedin, icon: LinkedInIcon },
              ].map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  className="bg-accent/5 hover:bg-accent text-muted hover:text-white flex h-11 w-11 items-center justify-center rounded-xl border border-border/40 transition-all active:scale-90"
                >
                  <social.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-8">
            {footerLinks.map((column) => (
              <div key={column.title} className="space-y-6">
                <h4 className="text-foreground text-xs font-black uppercase tracking-[0.2em]">
                  {column.title}
                </h4>
                <ul className="space-y-4">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        className="text-muted hover:text-accent group flex items-center gap-1.5 text-sm font-medium transition-all"
                      >
                        {link.name}
                        {link.external && (
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-60" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-border/40 mt-20 flex flex-col items-center justify-between gap-8 border-t pt-10 lg:flex-row">
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <p className="text-muted text-sm font-medium">
              © {currentYear} {siteConfig.name}. Build for the future of work.
            </p>
            <div className="flex items-center gap-2 rounded-full border border-border/40 bg-background/50 px-4 py-1.5 text-[11px] font-bold text-slate-500 backdrop-blur-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              SYSTEMS OPERATIONAL • ALL TEMPLATES FREE
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 lg:items-end">
            <p className="text-muted flex items-center gap-1.5 text-xs font-semibold">
              Proudly crafted with <Heart className="h-4 w-4 fill-red-500 text-red-500" /> in Public
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-[13px] font-bold text-slate-400">
              <Link href="/privacy" className="hover:text-accent transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-accent transition-colors">
                Terms
              </Link>
              <Link href="/faq" className="hover:text-accent transition-colors">
                FAQ
              </Link>
              <Link href="/security" className="hover:text-accent transition-colors">
                Security
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
