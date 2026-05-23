import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { Card, Badge, Button } from "@veriworkly/ui";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/contact`;
const pageOgImage = `${siteConfig.url}/og/contact-page-og.png`;

const supportEmail = siteConfig.email;
const supportEmailHref = `mailto:${supportEmail}`;

const githubDiscussionsUrl = `${siteConfig.links.github}/discussions`;
const githubSecurityPolicyUrl = "https://github.com/VeriWorkly/veriworkly/blob/master/SECURITY.md";

export const metadata: Metadata = {
  title: `Contact VeriWorkly Support | ATS Resume Builder Help`,
  description:
    "Get help with ATS resume templates, exports, bugs, feature requests, and privacy-related questions.",

  openGraph: {
    title: `Contact VeriWorkly Support`,
    description:
      "Contact VeriWorkly for resume builder support, bug reports, feature requests, and security issues.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `Contact VeriWorkly Support`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Contact VeriWorkly Support`,
    description:
      "Get support for resume templates, exports, feedback, bugs, and privacy-related issues.",
    images: [pageOgImage],
  },
};

const contactOptions = [
  {
    label: "Email",
    href: supportEmailHref,
    detail: `Send support and privacy questions directly to ${supportEmail}.`,
  },

  {
    label: "Security Policy (GitHub)",
    href: githubSecurityPolicyUrl,
    detail: "Read the disclosure guidance in SECURITY.md before reporting sensitive issues.",
  },

  {
    label: "GitHub Discussions",
    href: githubDiscussionsUrl,
    detail: "Use discussions for roadmap ideas, Q&A, and community conversation.",
  },

  {
    label: "GitHub",
    href: siteConfig.links.github,
    detail:
      "Best for reporting bugs, feature requests, issues, and discussions with the resume builder or templates in a transparent way.",
  },

  {
    label: "X / Twitter",
    href: siteConfig.links.twitter,
    detail:
      "Good for quick feedback, updates, and discussions about the resume builder at @VeriWorkly X(prev twitter) account.",
  },

  {
    label: "Roadmap",
    href: "/roadmap",
    detail:
      "Check what is already planned before starting a new request or discussion about features and improvements of VeriWorkly.",
  },
];

const ContactPage = () => {
  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact VeriWorkly",
    url: pageUrl,
    description:
      "Contact the VeriWorkly resume builder team for support, feedback, and security issues.",
    mainEntity: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      sameAs: [siteConfig.links.github, siteConfig.links.twitter],
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: supportEmail,
          url: siteConfig.links.github,
        },
      ],
    },
  };

  return (
    <>
      <PublicPageShell
        eyebrow="Contact"
        secondaryAction={{
          href: githubDiscussionsUrl,
          label: "Open discussions",
        }}
        primaryAction={{ href: supportEmailHref, label: "Email support" }}
        title="Contact the VeriWorkly Resume Builder Team"
        description="Get help with resume templates, exports, bugs, privacy questions, and feature requests."
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
        />

        <section className="grid gap-4 lg:grid-cols-3">
          {contactOptions.map((option) => (
            <Card key={option.label} className="space-y-3 p-6">
              <Badge>{option.label}</Badge>

              <p className="text-muted text-sm leading-6">{option.detail}</p>

              <Button asChild size="sm" variant="secondary">
                <a
                  href={option.href}
                  target={option.href.startsWith("http") ? "_blank" : undefined}
                  rel={option.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  Open {option.label}
                </a>
              </Button>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="space-y-4 p-6 md:p-8">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              How to Report Resume Builder Issues
            </p>

            <ul className="space-y-3 text-sm leading-6">
              <li className="text-muted">
                The page, resume template, or feature you were using when the issue happened.
              </li>

              <li className="text-muted">A short reproduction path, if the issue is technical.</li>

              <li className="text-muted">Screenshots or screen recordings for layout problems.</li>

              <li className="text-muted">
                Whether the issue affects the public site, resume editor, or dashboard.
              </li>

              <li className="text-muted">
                For security issues, share the minimum details needed to reproduce the problem and
                wait for a response before wider disclosure.
              </li>
            </ul>
          </Card>

          <Card className="space-y-4 p-6 md:p-8">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              Report Security Vulnerabilities
            </p>

            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Report sensitive issues privately through the security page.
            </h2>

            <p className="text-muted text-sm leading-7">
              If you believe you found a vulnerability, do not post it publicly first. Use the
              security page so the issue can be assessed before any wider disclosure.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="md" variant="primary">
                <a href={supportEmailHref}>Email security report</a>
              </Button>

              <Button asChild size="md" variant="secondary">
                <a href={githubSecurityPolicyUrl} target="_blank" rel="noreferrer">
                  Read SECURITY.md
                </a>
              </Button>
            </div>
          </Card>
        </section>
      </PublicPageShell>

      <section className="sr-only">
        <h2>Contact ATS Resume Builder Support</h2>

        <p>
          Contact VeriWorkly for help with ATS resume templates, exports, dashboard issues, privacy
          questions, and resume builder support.
        </p>
      </section>
    </>
  );
};

export default ContactPage;
