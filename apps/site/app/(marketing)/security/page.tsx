import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { Card, Button } from "@veriworkly/ui";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/security`;
const pageOgImage = `${siteConfig.url}/og/security-page-og.png`;

const supportEmail = siteConfig.email;
const supportEmailHref = `mailto:${supportEmail}`;

const githubDiscussionsUrl = `${siteConfig.links.github}/discussions`;
const githubSecurityPolicyUrl = "https://github.com/VeriWorkly/veriworkly/blob/master/SECURITY.md";

export const metadata: Metadata = {
  title: "AI Security & Privacy Policy | VeriWorkly",
  description:
    "Learn how we secure your data: local-first browser storage, encrypted cloud sync, and stateless, privacy-first AI resume tailoring.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: "Security & Encryption Policy | VeriWorkly",
    description:
      "Learn how we secure your resumes, web portfolios, and credentials using local-first storage and authenticated cloud encryption.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Security Overview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security & Encryption Policy | VeriWorkly",
    description:
      "A deep dive into VeriWorkly's sandboxes, IndexedDB databases, and E2E security parameters.",
    images: [pageOgImage],
  },
};

const securityPrinciples = [
  {
    title: "Least Privilege Architecture",
    description:
      "Our services are built on minimal access. By default, the application runs entirely inside your browser tab. We don't harvest or aggregate your career documents.",
  },
  {
    title: "Decoupled Data Sandboxes",
    description:
      "Your documents copy data from your Master Profile but remain isolated. Edits, visual scales, or deletions within templates do not leak to other assets.",
  },
  {
    title: "Responsible Disclosure",
    description:
      "We investigate security vulnerabilities proactively. We ask that potential flaws are reported privately to our team before publishing publicly.",
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
      "Security architecture, sandbox boundaries, and responsible disclosure procedures.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      <PublicPageShell
        eyebrow="Security"
        title="Sovereign security for your career records"
        primaryAction={{ href: supportEmailHref, label: "Email Security Team" }}
        secondaryAction={{ href: githubSecurityPolicyUrl, label: "Read SECURITY.md" }}
        description="Learn how VeriWorkly protects your resumes, cover letters, portfolios, and invoices using local-first browser storage, decoupled document sandboxes, and cloud sync options."
      >
        <section className="grid gap-6 md:grid-cols-3">
          {securityPrinciples.map((principle, idx) => (
            <Card
              key={principle.title}
              className="border-border bg-card flex flex-col justify-between rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[6px_6px_0_0_rgba(37,99,235,0.15)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]"
            >
              <div className="space-y-4">
                <span className="font-mono text-xs font-black tracking-wider text-blue-600 uppercase dark:text-blue-400">
                  Principle 0{idx + 1}
                </span>
                <h3 className="text-foreground text-xl font-bold tracking-tight">
                  {principle.title}
                </h3>
                <p className="text-muted text-sm leading-6">{principle.description}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-border bg-card space-y-6 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Storage & Sync
            </span>
            <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
              Encryption boundaries
            </h2>
            <ul className="text-muted space-y-4 text-sm leading-6">
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Browser Sandbox</strong>: All core files compile locally. Your credentials
                  are never uploaded to a remote parsing backend during PDF generation.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Cloud Backups</strong>: If you register and log in, your Master Profile
                  and sandbox documents are backed up and synchronized to our cloud. Connections are
                  encrypted in transit via SSL/TLS and secured by Better Auth OTP.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Public Portfolios & Subdomains</strong>: Portfolios published to
                  subdomains (e.g. username.veriworkly.com) are serveable publicly. Visitors&apos;
                  views are tracked in aggregate without using cookies.
                </span>
              </li>
            </ul>
          </Card>

          <Card className="border-border bg-card flex flex-col justify-between rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <div className="space-y-4">
              <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
                Disclosure
              </span>
              <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
                Vulnerability reporting
              </h2>
              <p className="text-muted text-sm leading-7">
                If you discover a security flaw or vulnerability in our database schema,
                authentication client, or server routing, please send details privately to{" "}
                {supportEmail}.
              </p>
              <p className="text-muted text-sm leading-7">
                We will acknowledge receipt within 24 hours and patch validated vulnerabilities
                quickly. Please do not publish exploit details in GitHub discussions or public
                forums before a fix is released.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-6">
              <Button
                asChild
                size="md"
                variant="secondary"
                className="w-full justify-center sm:w-auto"
              >
                <a href={supportEmailHref}>Email Security Report</a>
              </Button>
              <Button
                asChild
                size="md"
                variant="secondary"
                className="w-full justify-center sm:w-auto"
              >
                <a href={githubDiscussionsUrl} target="_blank" rel="noreferrer">
                  Open Discussions
                </a>
              </Button>
            </div>
          </Card>
        </section>
      </PublicPageShell>
    </>
  );
};

export default SecurityPage;
