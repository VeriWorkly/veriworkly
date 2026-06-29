import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { Card, Badge } from "@veriworkly/ui";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/privacy`;
const pageOgImage = `${siteConfig.url}/og/privacy-page-og.png`;

export const metadata: Metadata = {
  title: `Privacy Policy: Privacy-First AI Resume Builder | ${siteConfig.shortName}`,
  description:
    "Review how VeriWorkly protects resumes, cover letters, and portfolios. Learn about our local-first storage, encrypted sync, and stateless, private AI processing.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `Privacy Policy: Privacy-First AI Resume Builder | ${siteConfig.shortName}`,
    description:
      "Your documents stay private. We support local-first browser storage, secure cloud sync, and stateless AI processing.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Privacy Parameters`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Privacy Policy | ${siteConfig.shortName}`,
    description:
      "Explore data safety boundaries: browser IndexedDB storage, sitemap routes, and opt-in sharing rules.",
    images: [pageOgImage],
  },
};

const privacyTopics = [
  {
    title: "Local-First Browser Storage",
    description:
      "All credentials, layouts, and profile facts reside in your browser's private storage database (IndexedDB). No text is uploaded to remote servers without your deliberate choice.",
  },
  {
    title: "Opt-in Portfolios Sharing",
    description:
      "Published portfolios and link-in-bio cards are serveable publicly. Shared links can be password-protected, and you can take down pages from your dashboard at any time.",
  },
  {
    title: "Privacy-First Analytics",
    description:
      "We track visitor views and referral links on published portfolios. It is fully GDPR/CCPA compliant, runs without cookies, and does not profile visitor identities.",
  },
  {
    title: "Third-Party Integrations",
    description:
      "If you sync GitHub repositories or import LinkedIn data, those processes run directly under client-authorized sessions. We never store or sell your credential credentials.",
  },
];

const PrivacyPage = () => {
  const privacySchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy | VeriWorkly",
    url: pageUrl,
    description:
      "Learn how VeriWorkly secures career data through local-first and encrypted workflows.",
    about: {
      "@type": "Thing",
      name: "Privacy Policy",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacySchema) }}
      />

      <PublicPageShell
        eyebrow="Privacy Policy"
        title="Your credentials belong to you"
        secondaryAction={{ href: "/contact", label: "Contact Us" }}
        primaryAction={{ href: "/security", label: "Read Security Policy" }}
        description="Learn how VeriWorkly handles resumes, cover letters, portfolios, link-in-bio, and billing transactions with local-first parameters and optional cloud backups."
      >
        {/* Core Privacy Grid */}
        <section className="grid gap-6 md:grid-cols-2">
          {privacyTopics.map((topic) => (
            <Card
              key={topic.title}
              className="border-border/80 hover:border-accent/30 flex flex-col justify-between border p-6 transition duration-300 md:p-8"
            >
              <div className="space-y-4">
                <Badge className="bg-accent/10 text-accent w-fit border-none font-semibold">
                  Parameter
                </Badge>
                <h3 className="text-foreground text-xl font-bold tracking-tight">{topic.title}</h3>
                <p className="text-muted text-sm leading-6">{topic.description}</p>
              </div>
            </Card>
          ))}
        </section>

        {/* Detailed Sections */}
        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-border/80 space-y-6 border p-6 md:p-8">
            <h3 className="text-accent text-xs font-bold tracking-wider uppercase">User Rights</h3>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Direct ownership of data
            </h2>
            <ul className="text-muted list-disc space-y-4 pl-5 text-sm leading-6">
              <li>
                <strong>No Login Required</strong>: You can open the Document Studio, write resumes
                or cover letters, edit layout structures, and export PDFs completely without
                registering.
              </li>
              <li>
                <strong>Cloud Backups (Optional)</strong>: When you register, your Master Profile
                and layout sandboxes sync to the cloud. Connections are encrypted via SSL/TLS and
                secured by Better Auth.
              </li>
              <li>
                <strong>Zero Profiling</strong>: We do not compile, sell, or rent your professional
                details to advertiser databases or recruiter lists.
              </li>
            </ul>
          </Card>

          <Card className="border-border/80 space-y-6 border p-6 md:p-8">
            <h3 className="text-accent text-xs font-bold tracking-wider uppercase">Data Usage</h3>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              How we process assets
            </h2>
            <p className="text-muted text-sm leading-7">
              VeriWorkly keeps document drafts isolated from your Master Profile. Edits inside
              layouts remain local to that template, preventing unintentional modifications of your
              master credentials.
            </p>
            <p className="text-muted text-sm leading-7">
              Billing operations are processed directly by Dodo Payments in compliance with PCI-DSS
              standards. VeriWorkly does not store or process your credit card coordinates.
            </p>
          </Card>
        </section>

        <section className="text-muted border-border/60 border-t pt-6 text-sm">
          Have questions about your data privacy?{" "}
          <a
            href={`mailto:${siteConfig.email}`}
            className="text-accent font-medium hover:underline"
          >
            Contact support directly
          </a>
          .
        </section>
      </PublicPageShell>
    </>
  );
};

export default PrivacyPage;
