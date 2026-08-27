import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, UserCheck, ShieldCheck } from "lucide-react";

import { siteConfig } from "@/config/site";
import { buildPageMetadata } from "@/utils/metadata";
import { jsonLdScriptProps } from "@/utils/json-ld";
import ContactExperience from "@/features/contact/ContactExperience";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import { Reveal } from "@/components/marketing/Reveal";

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
        dangerouslySetInnerHTML={jsonLdScriptProps(contactSchema)}
      />

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        {/* Background Gradients */}
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />
        <div className="pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full bg-blue-500/5 blur-[130px]" />

        {/* Hero Section */}
        <section className="relative w-full overflow-hidden pt-28 pb-16 md:pt-36 md:pb-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 md:px-8 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="space-y-6 lg:col-span-7">
              <Reveal priority>
                <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs backdrop-blur-md">
                  <span className="bg-accent h-2 w-2 animate-pulse rounded-full" />
                  <span className="text-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
                    Support & Inquiries
                  </span>
                  <span className="text-muted/60 font-mono text-[10px]">|</span>
                  <span className="text-muted text-[11px]">Real Human Support</span>
                </div>
              </Reveal>

              <Reveal priority delay={0.06}>
                <h1 className="text-foreground text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.02] font-bold tracking-tight text-balance">
                  Talk to a real person. We&apos;re here to help.
                </h1>
              </Reveal>

              <Reveal priority delay={0.12}>
                <p className="text-muted max-w-xl text-base leading-relaxed sm:text-lg">
                  No support bots, no unmonitored ticket queues. Whether you need help with a
                  resume, have a question about AI credits, want custom portfolio advice, or found a
                  bug — we read and reply to every message.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={siteConfig.links.app}
                    className="bg-accent text-accent-foreground group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
                  >
                    <span>Launch builder</span>
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>

                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="border-border/80 bg-card/60 text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
                  >
                    <span>Email {siteConfig.email}</span>
                  </a>
                </div>
              </Reveal>
            </div>

            {/* Reassurance Bento Box */}
            <Reveal delay={0.2} className="lg:col-span-5">
              <div className="border-border/60 bg-card/50 relative space-y-4 overflow-hidden rounded-3xl border p-7 shadow-xl backdrop-blur-md">
                <div className="bg-accent/10 pointer-events-none absolute -top-10 -right-10 size-48 rounded-full blur-3xl" />

                <div className="flex items-center gap-3.5">
                  <span className="bg-accent/15 text-accent ring-accent/30 flex size-11 shrink-0 items-center justify-center rounded-2xl font-mono text-sm font-bold shadow-xs ring-1">
                    GR
                  </span>
                  <div>
                    <p className="text-foreground text-sm font-bold tracking-tight">
                      A real person reads every note
                    </p>
                    <p className="text-muted text-xs leading-relaxed">
                      Every email goes straight to our founder & engineering inbox.
                    </p>
                  </div>
                </div>

                <div className="border-border/40 space-y-2.5 border-t pt-4 text-xs">
                  <div className="text-muted flex items-center gap-2.5">
                    <Clock className="text-accent size-4 shrink-0" />
                    <span>
                      Average reply time:{" "}
                      <strong className="text-foreground font-semibold">24 to 48 hours</strong>
                    </span>
                  </div>
                  <div className="text-muted flex items-center gap-2.5">
                    <UserCheck className="size-4 shrink-0 text-emerald-500" />
                    <span>Direct engineering and product assistance</span>
                  </div>
                  <div className="text-muted flex items-center gap-2.5">
                    <ShieldCheck className="text-accent size-4 shrink-0" />
                    <span>100% private and confidential handling</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Contact Experience: Channels, Form, and Sidebar */}
        <section className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-8 md:pb-24">
          <ContactExperience />
        </section>

        <InteractiveCTA />
      </div>
    </>
  );
};

export default ContactPage;
