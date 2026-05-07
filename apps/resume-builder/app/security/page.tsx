import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { Card, Badge, Button } from "@veriworkly/ui";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/security`;
const pageOgImage = `${siteConfig.url}/og/security-page-og.png`;

const supportEmail = "info@veriworkly.com";
const supportEmailHref = `mailto:${supportEmail}`;

const githubDiscussionsUrl = `${siteConfig.links.github}/discussions`;
const githubSecurityPolicyUrl =
  "https://github.com/Gautam25Raj/veriworkly-resume/blob/master/SECURITY.md";

export const metadata: Metadata = {
  title: `Security Policy | Privacy-First Resume Builder`,
  description:
    "Learn how VeriWorkly protects resume data with secure, privacy-first, and responsible disclosure practices.",

  openGraph: {
    title: `Resume Builder Security Policy | ${siteConfig.shortName}`,
    description:
      "Security guidance, privacy protections, and responsible disclosure practices for VeriWorkly.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Security Policy`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Resume Builder Security Policy | ${siteConfig.shortName}`,
    description:
      "Learn how VeriWorkly handles security, privacy, and vulnerability reporting for resume data.",
    images: [pageOgImage],
  },
  alternates: {
    canonical: pageUrl,
  },
};

const securityPrinciples = [
  {
    title: "Least privilege",
    description: "Only the minimum amount of access should be used to support each feature.",
  },

  {
    title: "Clear boundaries",
    description:
      "Public, authenticated, and shareable routes should stay separated and intentional.",
  },

  {
    title: "Report first, disclose second",
    description: "Potential vulnerabilities should be reported privately before public disclosure.",
  },
];

const SecurityPage = () => {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    about: {
      "@type": "Thing",
      name: "Web application security and privacy",
    },
    name: "Security Policy | VeriWorkly",
    url: pageUrl,
    description:
      "Security model, data handling boundaries, and responsible disclosure policy for VeriWorkly.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      <PublicPageShell
        eyebrow="Security"
        title="Security and Privacy for VeriWorkly Resume Builder"
        description="Learn how VeriWorkly protects resume data with local-first storage and secure workflows."
        primaryAction={{ href: supportEmailHref, label: "Email security report" }}
        secondaryAction={{ href: githubDiscussionsUrl, label: "Open discussions" }}
      >
        <section className="grid gap-4 lg:grid-cols-3">
          {securityPrinciples.map((principle) => (
            <Card key={principle.title} className="space-y-3 p-6">
              <Badge>Security</Badge>

              <h2 className="text-foreground text-xl font-semibold">{principle.title}</h2>

              <p className="text-muted text-sm leading-6">{principle.description}</p>

              <p className="sr-only">
                Resume builder security, data privacy, and responsible disclosure policy.
              </p>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="space-y-4 p-6 md:p-8">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              What to expect
            </p>

            <ul className="space-y-3 text-sm leading-6">
              <li className="text-muted">The main product should remain usable without login.</li>

              <li className="text-muted">Optional cloud and sharing flows should stay explicit.</li>

              <li className="text-muted">
                Public routes should be crawlable, but admin and editor paths should not.
              </li>

              <li className="text-muted">
                If a security flaw is found, it should be reported privately first.
              </li>
            </ul>
          </Card>

          <Card className="space-y-4 p-6 md:p-8">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              Responsible disclosure
            </p>

            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Report Security Vulnerabilities Privately
            </h2>

            <p className="text-muted text-sm leading-7">
              If you discover a vulnerability, share the minimum details needed to reproduce it and
              wait for a response before publishing it more broadly.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="md" variant="primary">
                <a href={supportEmailHref}>Email {supportEmail}</a>
              </Button>

              <Button asChild size="md" variant="secondary">
                <a href={githubSecurityPolicyUrl} target="_blank" rel="noreferrer">
                  Read SECURITY.md
                </a>
              </Button>
            </div>
          </Card>
        </section>

        <Card className="space-y-4 p-6 md:p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Disclosure channels
          </p>

          <ul className="space-y-3 text-sm leading-6">
            <li className="text-muted">Email private reports to {supportEmail}.</li>
            <li className="text-muted">Follow the disclosure process in SECURITY.md.</li>
            <li className="text-muted">
              Use GitHub discussions for non-sensitive security questions.
            </li>
          </ul>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm" variant="secondary">
              <a href={supportEmailHref}>Email support</a>
            </Button>

            <Button asChild size="sm" variant="secondary">
              <a href={githubDiscussionsUrl} target="_blank" rel="noreferrer">
                Open discussions
              </a>
            </Button>
          </div>
        </Card>
      </PublicPageShell>

      <p className="sr-only">
        ATS resume builder security, privacy protection, and responsible disclosure policy.
      </p>
    </>
  );
};

export default SecurityPage;
