import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { Card, Badge } from "@veriworkly/ui";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/terms`;
const pageOgImage = `${siteConfig.url}/og/terms-page-og.png`;

export const metadata: Metadata = {
  title: `Terms of Use | ${siteConfig.shortName} Guidelines`,
  description:
    "Read the terms for using VeriWorkly including resume ownership, acceptable use, public sharing, and service limitations.",

  openGraph: {
    title: `Resume Builder Terms of Use | ${siteConfig.shortName}`,
    description:
      "Simple and transparent terms for using the VeriWorkly ATS resume builder platform.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Terms of Use`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Resume Builder Terms of Use | ${siteConfig.shortName}`,
    description: "Understand your rights, responsibilities, and usage guidelines for VeriWorkly.",
    images: [pageOgImage],
  },
};

const termsTopics = [
  {
    title: "Your content remains yours",
    description:
      "You retain ownership and responsibility for the resumes and data you create, store, or share using the service.",
  },

  {
    title: "Use the service responsibly",
    description:
      "Do not misuse the service, including attempting to abuse public endpoints, sharing mechanisms, or automated access in ways that harm the system or other users.",
  },

  {
    title: "Features can change",
    description:
      "Public features, templates, roadmap items, and optional integrations may be updated, modified, or removed over time.",
  },

  {
    title: "Third-party services",
    description:
      "If you connect or use external services, those providers operate under their own terms and policies. We are not responsible for their behavior or data handling.",
  },

  {
    title: "Service is provided as-is",
    description:
      "The service is provided on an 'as-is' and 'as-available' basis without warranties of any kind, including availability, reliability, or fitness for a particular purpose.",
  },

  {
    title: "Limitation of liability",
    description:
      "We are not liable for data loss, missed opportunities, or any direct or indirect damages resulting from the use or inability to use the service.",
  },

  {
    title: "Misuse may lead to restrictions",
    description:
      "Access to the service may be limited, suspended, or blocked if usage violates these terms or harms the system, other users, or the project.",
  },

  {
    title: "Service availability",
    description:
      "The project may be modified, paused, or discontinued at any time without notice. You are responsible for exporting and maintaining backups of your data.",
  },

  {
    title: "Open-source nature",
    description:
      "The project is open source and may be copied, modified, or self-hosted by others under its license. We do not control and are not responsible for third-party deployments, forks, or modified versions of the software.",
  },
];

const TermsPage = () => {
  return (
    <PublicPageShell
      eyebrow="Terms"
      title="Simple Terms for Using VeriWorkly Resume Builder"
      secondaryAction={{ href: "/contact", label: "Contact" }}
      primaryAction={{ href: "/about", label: "About the project" }}
      description="Simple and clear terms for using VeriWorkly. Understand your rights, responsibilities, resume ownership, acceptable use, public sharing, and service limitations."
    >
      <section className="grid gap-4 md:grid-cols-2">
        {termsTopics.map((topic) => (
          <Card key={topic.title} className="space-y-3 p-6">
            <Badge>Terms</Badge>

            <h2 className="text-foreground text-xl font-semibold">{topic.title}</h2>

            <p className="text-muted text-sm leading-6">{topic.description}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="space-y-4 p-6 md:p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Short version
          </p>

          <ul className="space-y-3 text-sm leading-6">
            <li className="text-muted">Use the app for lawful and respectful purposes.</li>

            <li className="text-muted">
              You are responsible for the content you create and share.
            </li>

            <li className="text-muted">
              Treat shared links as public unless explicitly protected.
            </li>

            <li className="text-muted">
              Keep backups of important data — the service is not a guaranteed storage system.
            </li>

            <li className="text-muted">
              Do not attempt to abuse, overload, or reverse engineer the system.
            </li>
          </ul>
        </Card>

        <Card className="space-y-4 p-6 md:p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Notes</p>

          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Simple and Transparent Usage Terms
          </h2>

          <p className="text-muted text-sm leading-7">
            The point of the site is to help people build resumes quickly, not to trap them in a
            complicated legal flow. If anything on this page conflicts with a more specific policy
            or feature-specific notice, the more specific notice should guide that feature.
          </p>
        </Card>
      </section>

      <Card className="space-y-4 p-6 md:p-8">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Jurisdiction</p>

        <p className="text-muted text-sm leading-7">
          These terms are governed by applicable laws in India. By using the service, you agree that
          any disputes will be handled under this jurisdiction.
        </p>
      </Card>

      <section className="text-muted text-sm">
        Questions about these terms?{" "}
        <a href="mailto:info@veriworkly.com" className="text-accent font-medium hover:underline">
          Contact us
        </a>
        .
      </section>
    </PublicPageShell>
  );
};

export default TermsPage;
