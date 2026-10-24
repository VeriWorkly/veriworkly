import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { LandingButton } from "@/components/marketing/LandingButton";
import { PageHero, PageClosing, PageSection } from "@/components/marketing/PageLayout";

import ContactExperience from "@/features/contact/ContactExperience";
import ContactChannelsSection from "@/features/contact/components/ContactChannelsSection";

export const revalidate = false;
export const dynamic = "force-static";

const supportEmail = siteConfig.email;

export const metadata: Metadata = buildPageMetadata({
  path: "/contact",

  title: `Contact Support & Team Inquiries | ${siteConfig.shortName}`,
  description:
    "Get help with resumes, cover letters, ATS matching, web portfolios, AI credits, custom subdomains, or billing. A real person reads and replies to every message.",

  ogTitle: "Talk to a Real Person on the VeriWorkly Team",
  ogDescription:
    "No support bots, no unmonitored ticket queues. Every message reaches a real person on our team.",

  twitterTitle: "Contact VeriWorkly Support",
  twitterDescription:
    "Questions about resumes, portfolios, AI credits, or billing? Reach our team directly.",

  image: "/og/contact-page-og.png",
  imageAlt: "Contact VeriWorkly Support",

  keywords: [
    "VeriWorkly support",
    "contact VeriWorkly",
    "AI credits help",
    "resume builder support",
    "portfolio subdomain help",
  ],
});

const pageUrl = `${siteConfig.url}/contact`;

const ContactPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Contact", item: pageUrl },
    ],
  };

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact VeriWorkly Support",
    url: pageUrl,
    description:
      "Contact the VeriWorkly support and engineering team for help, questions, feedback, or billing.",
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
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(contactSchema)}
      />

      <PageHero
        title="Talk to a"
        highlight="real person."
        lede="No support bots and no unmonitored ticket queue. A resume, AI credits, your portfolio or a bug: a person on the team reads your message and replies."
        aside={
          <div className="flex flex-wrap gap-3">
            <LandingButton showArrow size="lg" variant="solid" href="#message">
              Write a message
            </LandingButton>
            <LandingButton size="lg" variant="outline" href={`mailto:${supportEmail}`}>
              Email us
            </LandingButton>
          </div>
        }
      />

      <PageSection
        tone="card"
        title="Write to the team."
        lede="Name, email and a few lines about what you need. You get a confirmation receipt straight away."
      >
        <ContactExperience />
      </PageSection>

      <ContactChannelsSection />

      <PageClosing
        title="Rather just try it?"
        lede="The studio has a guest mode, so you can see how it works while you wait for a reply."
      />
    </>
  );
};

export default ContactPage;
