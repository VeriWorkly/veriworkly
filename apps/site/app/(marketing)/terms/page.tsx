import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { Card, Badge } from "@veriworkly/ui";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/terms`;
const pageOgImage = `${siteConfig.url}/og/terms-page-og.png`;

export const metadata: Metadata = {
  title: `Terms of Service & AI Credit Policy | ${siteConfig.shortName}`,
  description:
    "Review guidelines for using VeriWorkly: content ownership, layout publishing, subdomain terms, AI credit usage, and open-source licenses.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `Terms of Service & AI Credit Policy | ${siteConfig.shortName}`,
    description:
      "Simple, transparent terms for using VeriWorkly's resumes, portfolios, AI credit limits, and billing services.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Terms`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Terms of Service | ${siteConfig.shortName}`,
    description: "Review content ownership guidelines and platform boundaries for VeriWorkly.",
    images: [pageOgImage],
  },
};

const termsTopics = [
  {
    title: "Sovereign Content Ownership",
    description:
      "You retain complete ownership and responsibility for the credentials, resume details, screenshots, and billing statements you manage on our platform.",
  },
  {
    title: "Responsible Platform Use",
    description:
      "Do not exploit public endpoints, overload sitemap maps, or trigger automated scraping loops that disrupt the workspace for other users.",
  },
  {
    title: "Independent Sandboxing",
    description:
      "Your documents copy facts from your Master Profile but act as isolated layout sandboxes. Edits inside templates do not impact your master records.",
  },
  {
    title: "Third-Party Connectors",
    description:
      "If you sync data from GitHub or parse LinkedIn PDFs, those actions fall under those platforms' terms. We are not responsible for their data models.",
  },
  {
    title: "As-Is Service Terms",
    description:
      "VeriWorkly is provided as-is without warranties. You are responsible for exporting backups of your local IndexedDB profiles.",
  },
  {
    title: "Mitigated Liability",
    description:
      "We are not liable for recruitment outcomes, lost opportunities, or database wipes resulting from browser cache clearing.",
  },
];

const TermsPage = () => {
  const termsSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service | VeriWorkly",
    url: pageUrl,
    description: "Terms of Service and guidelines for VeriWorkly career workspace.",
    about: {
      "@type": "Thing",
      name: "Terms of Service",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsSchema) }}
      />

      <PublicPageShell
        eyebrow="Terms of Service"
        title="Simple, transparent guidelines"
        secondaryAction={{ href: "/contact", label: "Contact Us" }}
        primaryAction={{ href: "/about", label: "About the Project" }}
        description="Simple guidelines for using VeriWorkly. Review terms covering resumes, cover letters, portfolios, link-in-bio, and billing services."
      >
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {termsTopics.map((topic) => (
            <Card
              key={topic.title}
              className="border-border/80 hover:border-accent/30 flex flex-col justify-between border p-6 transition duration-300 md:p-8"
            >
              <div className="space-y-4">
                <Badge className="bg-accent/10 text-accent w-fit border-none font-semibold">
                  Guideline
                </Badge>
                <h3 className="text-foreground text-xl font-bold tracking-tight">{topic.title}</h3>
                <p className="text-muted text-sm leading-6">{topic.description}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-border/80 space-y-6 border p-6 md:p-8">
            <h3 className="text-accent text-xs font-bold tracking-wider uppercase">
              Quick Summary
            </h3>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Your responsibilities in short
            </h2>
            <ul className="text-muted list-disc space-y-3 pl-5 text-sm leading-6">
              <li>Use the workspace for legal career building and publishing.</li>
              <li>Published subdomain URLs are publicly viewable by default.</li>
              <li>Keep copies of your profile database files locally.</li>
              <li>Do not run scraping bots or automated spam templates on the sitemap.</li>
            </ul>
          </Card>

          <Card className="border-border/80 space-y-6 border p-6 md:p-8">
            <h3 className="text-accent text-xs font-bold tracking-wider uppercase">Transparency</h3>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Open Source & forks
            </h2>
            <p className="text-muted text-sm leading-7">
              VeriWorkly&apos;s core is open source. If you use a fork or self-hosted deployment run
              by a third party, your relationship falls under their deployment terms. We do not
              control independent server environments.
            </p>
            <p className="text-muted text-sm leading-7">
              Billing transactions are run via Dodo Payments. Charge issues, double billing, or
              payment failures are handled under Dodo Payments&apos; partner terms.
            </p>
          </Card>
        </section>

        <section className="text-muted border-border/60 border-t pt-6 text-sm">
          Have questions about these guidelines?{" "}
          <a
            href={`mailto:${siteConfig.email}`}
            className="text-accent font-medium hover:underline"
          >
            Contact support
          </a>
          .
        </section>
      </PublicPageShell>
    </>
  );
};

export default TermsPage;
