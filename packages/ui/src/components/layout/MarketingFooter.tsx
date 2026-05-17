import Link from "next/link";
import Image from "next/image";
import { Heart, Mail, MapPin, ArrowUpRight } from "lucide-react";

import { Container } from "./Container";

interface FooterLink {
  name: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterSocialLink {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MarketingFooterProps {
  homeHref: string;
  logoSrc: string;
  logoAlt: string;
  shortName: string;
  brandName: string;
  description: string;
  email: string;
  location: string;
  socialLinks: FooterSocialLink[];
  footerColumns: FooterColumn[];
  legalLinks: FooterLink[];
  tagline: string;
  statusText: string;
}

export const MarketingFooter = ({
  homeHref,
  logoSrc,
  logoAlt,
  shortName,
  brandName,
  description,
  email,
  location,
  socialLinks,
  footerColumns,
  legalLinks,
  tagline,
  statusText,
}: MarketingFooterProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/40 relative overflow-hidden border-t bg-zinc-50/80 pt-20 pb-10 dark:bg-zinc-950/80">
      <div className="bg-accent/10 pointer-events-none absolute -bottom-48 -left-48 h-125 w-125 rounded-full blur-[120px]" />
      <div className="bg-accent/5 pointer-events-none absolute -top-48 -right-48 h-125 w-125 rounded-full blur-[120px]" />

      <Container className="relative">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-8 lg:col-span-4">
            <div className="space-y-6">
              <Link href={homeHref} className="group flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-md transition-transform group-hover:scale-110">
                  <Image fill sizes="40px" alt={logoAlt} src={logoSrc} className="object-contain" />
                </div>

                <span className="font-mono text-2xl font-semibold tracking-tight">{shortName}</span>
              </Link>

              <p className="text-muted max-w-sm text-base leading-relaxed">{description}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="bg-accent/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <Mail className="text-accent h-4 w-4" />
                </div>

                {email}
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="bg-accent/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <MapPin className="text-accent h-4 w-4" />
                </div>

                {location}
              </div>
            </div>

            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <Link
                  target="_blank"
                  key={social.name}
                  href={social.href}
                  className="bg-accent/5 hover:bg-accent text-muted border-border/40 flex h-11 w-11 items-center justify-center rounded-xl border transition-all hover:text-white active:scale-95"
                >
                  <social.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-8">
            {footerColumns.map((column) => (
              <div key={column.title} className="space-y-6">
                <h4 className="text-foreground text-xs font-black tracking-[0.2em] uppercase">
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

        <div className="border-border/40 mt-20 flex flex-col items-center justify-between gap-8 border-t pt-10 lg:flex-row">
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <p className="text-muted text-sm font-medium">
              &copy; {currentYear} {brandName}. {tagline}
            </p>

            <div className="border-border/40 bg-background/50 flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-bold text-slate-500 backdrop-blur-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              {statusText}
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 lg:items-end">
            <p className="text-muted flex items-center gap-1.5 text-xs font-semibold">
              Proudly crafted with <Heart className="h-4 w-4 fill-red-500 text-red-500" /> in Public
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-[13px] font-bold text-slate-400">
              {legalLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="hover:text-accent transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};
