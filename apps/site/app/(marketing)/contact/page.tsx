import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircleQuestion } from "lucide-react";

import { siteConfig } from "@/config/site";
import { ContactExperience } from "./contact-experience";

import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

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

      {/* Hero: split layout with a live "who answers" widget, instead of the
          symmetric icon-badge-headline pattern used elsewhere. */}
      <section className="relative w-full overflow-hidden bg-white pt-32 pb-20 md:pt-40 md:pb-24 dark:bg-[#000000]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(120,119,198,0.08)_1px,transparent_1px)] bg-size-[22px_22px] opacity-60 mask-[radial-gradient(ellipse_60%_60%_at_50%_0%,#000_60%,transparent_100%)]" />

        <div className="relative z-10 mx-auto grid max-w-350 gap-12 px-6 md:px-8 lg:grid-cols-12 lg:items-center lg:gap-8">
          <div className="lg:col-span-7">
            <Reveal>
              <SectionEyebrow icon={MessageCircleQuestion} label="Support" />
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-6 text-4xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-5xl md:text-6xl dark:text-white">
                Get in touch with us
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
                Write to us if you need help with documents, billing, custom portfolios, or
                feature requests.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-10">
                <Link
                  href={siteConfig.links.app}
                  className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-zinc-950 px-8 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
                >
                  Open Studio
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="lg:col-span-5">
            <div className="flex items-center gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
                GR
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  A real person reads every message
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  No support bots, no ticket queues sold to a third party. Just us.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-300 px-6 py-16 md:px-8 md:py-20">
        <ContactExperience />
      </section>

      <InteractiveCTA />

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
