import type { Metadata } from "next";
import { principles } from "./data/principles";
import { siteConfig } from "@/config/site";
import { Card, Button } from "@veriworkly/ui";
import { PublicPageShell } from "@/components/layout/PublicPageShell";

const pageUrl = `${siteConfig.url}/about`;
const pageOgImage = `${siteConfig.url}/og/about-page-og.png`;

export const metadata: Metadata = {
  title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
  description:
    "We believe job seekers should own their data and use AI safely. VeriWorkly is a local-first, privacy-focused AI career workspace for resumes, cover letters, and portfolios.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
    description:
      "We build career tools that put job seekers in control of their data and AI assistant usage. No paywalls, no sold profiles, no data locking.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "About VeriWorkly Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
    description:
      "Explore the open-source, AI-powered career workspace focused on data sovereignty and client-side security.",
    images: [pageOgImage],
  },
};

const AboutPage = () => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    sameAs: [siteConfig.links.github, siteConfig.links.twitter, siteConfig.links.linkedin],
    founder: {
      "@type": "Person",
      name: siteConfig.creator,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />

      <PublicPageShell
        eyebrow="Mission"
        title="We build tools that keep you in control of your career data"
        secondaryAction={{ href: "/contact", label: "Message the Team" }}
        primaryAction={{ href: "https://app.veriworkly.com", label: "Open Studio" }}
        description="VeriWorkly is a private workspace for your resumes, cover letters, portfolios, and invoices. You can create ready-to-use documents on your own terms. No paywalls, no sold profiles, and no account traps."
      >
        <section className="grid gap-6 md:grid-cols-3">
          {principles.map((principle, idx) => (
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

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border bg-card space-y-6 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <span className="text-xs font-black tracking-widest text-red-500 uppercase dark:text-red-400">
              The Problem
            </span>
            <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
              The career software tax
            </h2>
            <p className="text-muted text-sm leading-7">
              Most resume tools operate on a trap. They offer templates for free, guide you through
              writing your credentials, and then lock your download behind a recurring subscription.
              Alternatively, they collect your profile details and sell them to recruitment
              databases.
            </p>
            <p className="text-muted text-sm leading-7">
              VeriWorkly is a direct alternative. We believe your professional history belongs to
              you. Our editor compiles documents directly in your browser&apos;s memory using
              client-side engines. Your data is never held hostage, and you can export professional
              PDFs or publish static portfolios instantly.
            </p>
          </Card>

          <Card className="border-border bg-card space-y-6 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Data Architecture
            </span>
            <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
              How your data is stored
            </h2>
            <p className="text-muted text-sm leading-7">
              We separate your master career records from your document layout sandboxes:
            </p>
            <ul className="text-muted space-y-4 text-xs leading-6">
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Master Profile</strong>: Stores your complete background history. By
                  default, it lives locally in your browser (IndexedDB). If you log in with an
                  account, it is securely backed up and synchronized in the cloud.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Layout Sandbox</strong>: Adjust visual layouts independently. When you
                  create a new resume or portfolio, the app pulls a snapshot from your Master
                  Profile.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Decoupled Edits</strong>: Tweaking a resume does not change your Master
                  Profile, and updating your Master Profile will not overwrite existing documents.
                  You can customize templates freely.
                </span>
              </li>
            </ul>
          </Card>
        </section>

        <Card className="border-border bg-card space-y-6 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
          <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Product Scope
          </span>
          <h2 className="text-foreground text-wrap-balance text-3xl font-extrabold tracking-tight">
            Four documents, one source of truth
          </h2>
          <p className="text-muted max-w-3xl text-sm leading-7">
            Your career documents are connected assets. VeriWorkly links your resume, cover letter,
            web presence, and professional invoices under a single framework:
          </p>
          <div className="grid gap-6 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-border space-y-2 border-t pt-4">
              <h4 className="text-foreground font-bold">1. Document Studio</h4>
              <p className="text-muted text-xs leading-5">
                Create ATS-friendly resumes and matched cover letters tailored to specific targets.
              </p>
            </div>
            <div className="border-border space-y-2 border-t pt-4">
              <h4 className="text-foreground font-bold">2. Personal Portfolios</h4>
              <p className="text-muted text-xs leading-5">
                Deploy responsive web portfolios hosted on subdomains with visitor view analytics.
              </p>
            </div>
            <div className="border-border space-y-2 border-t pt-4">
              <h4 className="text-foreground font-bold">3. Link-in-Bio Cards</h4>
              <p className="text-muted text-xs leading-5">
                Share your links and list digital services with very competitive transaction rates.
              </p>
            </div>
            <div className="border-border space-y-2 border-t pt-4">
              <h4 className="text-foreground font-bold">4. Utility Docs</h4>
              <p className="text-muted text-xs leading-5">
                Generate invoices and project agreements locally to manage your freelance
                operations.
              </p>
            </div>
          </div>
        </Card>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-border bg-card flex flex-col justify-between rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[6px_6px_0_0_rgba(37,99,235,0.15)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <div className="space-y-4">
              <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
                Referrals
              </span>
              <h3 className="text-foreground text-2xl font-bold tracking-tight">
                Affiliate Program
              </h3>
              <p className="text-muted text-sm leading-7">
                Promote user sovereignty in career documents and earn recurring commissions of 2%,
                3%, or 5%. Track conversions, clicks, and payouts inside your partner dashboard.
              </p>
            </div>
            <div className="pt-6">
              <Button asChild size="md" variant="secondary" className="w-full justify-center">
                <a href="/affiliate">Become an Affiliate</a>
              </Button>
            </div>
          </Card>

          <Card className="border-border bg-card flex flex-col justify-between rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[6px_6px_0_0_rgba(37,99,235,0.15)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <div className="space-y-4">
              <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
                Students
              </span>
              <h3 className="text-foreground text-2xl font-bold tracking-tight">
                Student Ambassador
              </h3>
              <p className="text-muted text-sm leading-7">
                Represent VeriWorkly on your campus, help peers build their career identity, and
                earn free Portfolio Pro licenses, point boosters, and hackathon workshop
                sponsorships.
              </p>
            </div>
            <div className="pt-6">
              <Button asChild size="md" variant="secondary" className="w-full justify-center">
                <a href="/ambassador">Join Student Program</a>
              </Button>
            </div>
          </Card>
        </section>
      </PublicPageShell>
    </>
  );
};

export default AboutPage;
