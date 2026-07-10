import type { ReactNode } from "react";

import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { Badge, Button } from "@veriworkly/ui";

import ShowcaseCards from "./component/ShowcaseCards";

const pageUrl = `${siteConfig.url}/login`;
const pageOgImage = `${siteConfig.url}/og/login-page-og.png`;

export const metadata: Metadata = {
  title: "Login | VeriWorkly Career Suite",
  description:
    "Access your VeriWorkly account to build ATS-optimized resumes, generate cover letters, and publish portfolio websites on your own subdomain.",
  alternates: {
    canonical: pageUrl,
  },

  openGraph: {
    title: `Login | VeriWorkly Career Suite`,
    description:
      "Access your VeriWorkly account to build ATS-optimized resumes, generate cover letters, and publish portfolio websites on your own subdomain.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `Login | VeriWorkly Career Suite`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Login | VeriWorkly Career Suite`,
    description:
      "Access your VeriWorkly account to build ATS-optimized resumes, generate cover letters, and publish portfolio websites on your own subdomain.",
    images: [pageOgImage],
  },
};

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${siteConfig.url}/#webapp`,
        name: "VeriWorkly Career Suite",
        url: siteConfig.links.main,
        applicationCategory: "BusinessApplication",
        operatingSystem: "All",
        description:
          "A privacy-first, open-source ATS resume builder, cover letter generator, and portfolio builder that helps you create matching professional CVs and publish them to a custom subdomain.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Free online ATS-friendly resume builder",
          "AI-assisted cover letter generator",
          "Personal developer and designer portfolios with custom subdomains",
          "Local-first browser storage with secure database synchronization",
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${siteConfig.url}/login/#webpage`,
        url: `${siteConfig.url}/login`,
        name: "Login | VeriWorkly Career Suite",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${siteConfig.url}/#website`,
          name: "VeriWorkly",
          url: siteConfig.links.main,
        },
        description:
          "Access your VeriWorkly account to build ATS-optimized resumes, generate cover letters, and publish portfolio websites on your own subdomain.",
      },
    ],
  };

  return (
    <main className="surface-grid relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-14 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="absolute top-6 right-6 z-50">
        <Link
          target="_blank"
          rel="noopener noreferrer"
          href={siteConfig.links.github}
          className="border-border bg-card/65 text-muted hover:text-foreground focus-visible:ring-accent/40 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-all duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
        >
          <Image
            width={14}
            height={14}
            alt="GitHub"
            className="dark:invert"
            src="/icons/socials/github.svg"
          />
          <span>Open Source</span>
        </Link>
      </div>

      <div className="bg-accent/12 pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full blur-3xl" />
      <div className="bg-accent/10 pointer-events-none absolute -bottom-28 left-0 h-72 w-72 rounded-full blur-3xl" />

      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <section className="border-border bg-card/92 relative hidden space-y-6 overflow-hidden rounded-4xl border p-8 pb-9 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] backdrop-blur lg:flex lg:h-[610px] lg:flex-col lg:justify-between">
          <div className="bg-accent/10 pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            <Badge className="bg-background/70">VeriWorkly Career Suite</Badge>

            <div className="space-y-3">
              <h2 className="text-foreground text-4xl leading-tight font-semibold tracking-tight">
                You do not need to sign in.
              </h2>

              <p className="text-muted max-w-md text-base">
                All features work directly in your browser. Create an account only if you want
                secure cloud backups, matched cover letters, and to publish your portfolio to a
                custom subdomain.
              </p>
            </div>

            <ShowcaseCards />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="md" className="w-full sm:w-auto">
              <Link href={siteConfig.links.portfolio} target="_blank" rel="noopener noreferrer">
                Explore Portfolios
              </Link>
            </Button>

            <Button asChild size="md" variant="secondary" className="w-full sm:w-auto">
              <Link href={`${siteConfig.links.main}/templates`}>Browse Templates</Link>
            </Button>
          </div>
        </section>

        <section className="relative mx-auto w-full max-w-xl lg:flex lg:h-[610px] lg:flex-col">
          {children}
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;
