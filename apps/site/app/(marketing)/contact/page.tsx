import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { ContactExperience } from "./contact-experience";
import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/contact`;
const pageOgImage = `${siteConfig.url}/og/contact-page-og.png`;
const supportEmail = siteConfig.email;

export const metadata: Metadata = {
  title: `Contact Support & AI Billing Help | ${siteConfig.shortName}`,
  description:
    "Get support for documents, portfolios, AI credit limits, subdomain routing, billing, and privacy-first features.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `Contact Support & AI Billing Help | ${siteConfig.shortName}`,
    description:
      "Contact us for help with resumes, portfolios, AI credits, subdomains, and account billing queries.",
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
    title: `Contact Support | ${siteConfig.shortName}`,
    description:
      "Get support for resumes, cover letters, portfolios, custom subdomains, and billing queries.",
    images: [pageOgImage],
  },
};

const ContactPage = () => {
  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact VeriWorkly Support",
    url: pageUrl,
    description: "Contact the VeriWorkly support team for help, feedback, and security issues.",
    mainEntity: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      sameAs: [siteConfig.links.github, siteConfig.links.twitter, siteConfig.links.linkedin],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />

      <PublicPageShell
        eyebrow="Support"
        secondaryAction={{
          href: `${siteConfig.links.github}/discussions`,
          label: "Open Discussions",
        }}
        primaryAction={{ href: "https://app.veriworkly.com", label: "Open Studio" }}
        title="Get in touch with us"
        description="Write to us if you need help with documents, billing, custom portfolios, or feature requests. We usually reply within 24 to 48 hours."
      >
        <ContactExperience />
      </PublicPageShell>

      <section className="sr-only">
        <h2>Contact VeriWorkly Support</h2>
        <p>
          Contact VeriWorkly for help with documents, exports, custom portfolios, subdomains,
          privacy questions, and platform support.
        </p>
      </section>
    </>
  );
};

export default ContactPage;
