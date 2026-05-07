import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { principles } from "./data/principles";

import { Card, Badge, Button } from "@veriworkly/ui";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/about`;
const pageOgImage = `${siteConfig.url}/og/about-page-og.png`;

export const metadata: Metadata = {
  title: "About VeriWorkly | Free ATS Resume Builder",
  description:
    "Learn how VeriWorkly helps users create ATS-friendly resumes with privacy-first, open-source, and no-login workflows.",

  openGraph: {
    title: "About VeriWorkly | Free ATS Resume Builder",
    description:
      "Privacy-first ATS resume builder with open-source transparency and no signup required.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "About VeriWorkly ATS Resume Builder",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "About VeriWorkly | Free ATS Resume Builder",
    description:
      "Open-source ATS resume builder focused on privacy, exports, and no-login resume creation.",
    images: [pageOgImage],
  },
};

const AboutPage = () => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    sameAs: [siteConfig.links.github, siteConfig.links.twitter],
    founder: {
      "@type": "Person",
      name: "Gautam Raj",
    },
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "VeriWorkly Resume Builder",
    url: siteConfig.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Free resume builder with no login. Create ATS-friendly resumes online with full privacy.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <PublicPageShell
        eyebrow="About"
        primaryAction={{ href: "/dashboard", label: "Open Dashboard" }}
        secondaryAction={{ href: "/contact", label: "Contact the team" }}
        title="Free ATS Resume Builder Built for Privacy and Simplicity"
        description="VeriWorkly is a privacy-first ATS resume builder with modern templates, easy exports, and no login required."
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema, webAppSchema]),
          }}
        />

        <section className="grid gap-4 lg:grid-cols-3">
          {principles.map((principle) => (
            <Card key={principle.title} className="space-y-3 p-6">
              <Badge>Principle</Badge>

              <h2 className="text-foreground text-xl font-semibold">{principle.title}</h2>

              <p className="text-muted text-sm leading-6">{principle.description}</p>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="space-y-4 p-6 md:p-8">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              Why We Built VeriWorkly
            </p>

            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Career tools should not force people to trade privacy for utility.
            </h2>

            <p className="text-muted text-sm leading-7">
              The product is structured around a simple idea: a resume builder is most useful when
              it is easy to use, easy to audit, and easy to move away from if needed. That means no
              unnecessary account gate, clear export paths, and public pages that explain how the
              system works.
            </p>

            <p className="text-muted text-sm leading-7">
              The public site is intentionally small but complete. It includes the landing page,
              templates, roadmap, policy pages, and contact routes so people can verify the project
              before they trust it.
            </p>
          </Card>

          <Card className="space-y-4 p-6 md:p-8">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              Features of VeriWorkly Resume Builder
            </p>

            <ul className="space-y-3 text-sm leading-6">
              <li className="text-muted">Free resume creation without forced sign-up or login.</li>

              <li className="text-muted">
                ATS-friendly resume templates with fast export options.
              </li>

              <li className="text-muted">
                Optional sharing and sync instead of mandatory storage.
              </li>

              <li className="text-muted">A public roadmap so upcoming changes are visible.</li>

              <li className="text-muted">Clear policy pages and contact routes for trust.</li>
            </ul>

            <div className="pt-2">
              <Button asChild size="md" variant="secondary">
                <a href="/faq">Read the FAQ</a>
              </Button>
            </div>
          </Card>
        </section>
      </PublicPageShell>

      <section className="sr-only">
        <h2>About VeriWorkly ATS Resume Builder</h2>

        <p>
          VeriWorkly is a free ATS-friendly resume builder with no login required. Create
          professional resumes, customize templates, and export resumes instantly with privacy-first
          workflows.
        </p>
      </section>
    </>
  );
};

export default AboutPage;
