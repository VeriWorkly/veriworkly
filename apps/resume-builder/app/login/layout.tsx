import type { ReactNode } from "react";

import Link from "next/link";
import { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { Badge, Button } from "@veriworkly/ui";

const pageUrl = `${siteConfig.url}/login`;
const pageOgImage = `${siteConfig.url}/og/login-page-og.png`;

export const metadata: Metadata = {
  title: "Login | ATS Resume Builder",
  description:
    "Login to sync resumes, manage sharing, and access cloud features in VeriWorkly resume builder.",

  openGraph: {
    title: `Login | ATS Resume Builder`,
    description:
      "Login to sync resumes, manage sharing, and access cloud features in VeriWorkly resume builder.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `Login | ATS Resume Builder`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Login | ATS Resume Builder`,
    description:
      "Login to sync resumes, manage sharing, and access cloud features in VeriWorkly resume builder.",
    images: [pageOgImage],
  },
};

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <main className="surface-grid relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-14 md:py-20">
      <div className="bg-accent/12 pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full blur-3xl" />
      <div className="bg-accent/10 pointer-events-none absolute -bottom-28 left-0 h-72 w-72 rounded-full blur-3xl" />

      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <section className="border-border bg-card/92 relative hidden space-y-6 overflow-hidden rounded-4xl border p-7 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div className="bg-accent/10 pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            <Badge className="bg-background/70">VeriWorkly Resume</Badge>

            <div className="space-y-3">
              <h2 className="text-foreground text-4xl leading-tight font-semibold tracking-tight">
                Login is optional.
              </h2>

              <p className="text-muted max-w-md text-base">
                Everything works without login. Sign in only if you want cloud sync, controlled
                sharing, and profile-powered resume variants.
              </p>
            </div>

            <div className="space-y-3">
              <div className="border-border/80 bg-background/70 rounded-2xl border p-3">
                <p className="text-foreground text-sm font-semibold">
                  Master Profile + Derived Resumes
                </p>

                <p className="text-muted mt-1 text-sm">Edit once, propagate selected changes.</p>
              </div>

              <div className="border-border/80 bg-background/70 rounded-2xl border p-3">
                <p className="text-foreground text-sm font-semibold">Share Links with Controls</p>

                <p className="text-muted mt-1 text-sm">Expiry, password, view-only, PDF toggle.</p>
              </div>

              <div className="border-border/80 bg-background/70 rounded-2xl border p-3">
                <p className="text-foreground text-sm font-semibold">Per-Resume Sync Toggle</p>

                <p className="text-muted mt-1 text-sm">Cloud sync stays opt-in, default off.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="md" className="w-full sm:w-auto">
              <Link href="/dashboard">Continue Without Login</Link>
            </Button>

            <Button asChild size="md" variant="secondary" className="w-full sm:w-auto">
              <Link href="/templates">Explore Templates</Link>
            </Button>
          </div>
        </section>

        <section className="relative mx-auto w-full max-w-xl">{children}</section>
      </div>
    </main>
  );
};

export default AuthLayout;
