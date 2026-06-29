import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Card, Button } from "@veriworkly/ui";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Sparkles, FileText, Globe, RefreshCcw, Database, ShieldCheck, Check } from "lucide-react";

const pageUrl = `${siteConfig.url}/features`;
const pageOgImage = `${siteConfig.url}/og/features-page-og.png`;

export const metadata: Metadata = {
  title: `Platform Features & AI Tools | ${siteConfig.shortName}`,
  description:
    "Explore our AI-powered resume tailoring, cover letter writer, visual editor, web portfolio publisher, local sandboxing, and secure cloud sync.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `Platform Features & AI Tools | ${siteConfig.shortName}`,
    description:
      "A complete ecosystem for career assets: resumes, cover letters, portfolios, and link cards with offline-first storage and built-in AI tailoring.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "VeriWorkly Platform Features",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Platform Features & AI Tools | ${siteConfig.shortName}`,
    description:
      "Review our privacy-first features: AI document tailoring, client-side PDF compiler, sitemap router, and aggregate statistics.",
    images: [pageOgImage],
  },
};

const featureList = [
  {
    title: "Document Studio",
    description:
      "Write and format ATS-friendly resumes and cover letters in a structured layout system.",
    icon: FileText,
    bullets: [
      "Strict layout compilation outputting parser-friendly text markup",
      "Dynamic sliders for visual margins, paddings, and font sizes",
      "Curated typography pairings with layout scale locks",
      "Local PDF exports rendered directly in the browser using client engines",
    ],
    className: "md:col-span-2 lg:col-span-2",
  },
  {
    title: "Web Portfolios",
    description: "Publish your credentials as a fast, responsive website mapped to subdomains.",
    icon: Globe,
    bullets: [
      "Subdomain routing (e.g. username.veriworkly.com)",
      "Upload screenshots and project assets securely",
      "Custom SEO title options and layout toggle controls",
    ],
    className: "md:col-span-1 lg:col-span-1",
  },
  {
    title: "Link Cards",
    description:
      "Build a single, clean link aggregator for your social profiles and digital services.",
    icon: Sparkles,
    bullets: [
      "Fast-loading mobile layout optimized for social media links",
      "Add custom link buttons or contact cards",
    ],
    className: "md:col-span-1 lg:col-span-1",
  },
  {
    title: "Master Profile Sandbox",
    description: "Synchronize factual history without cluttering individual document layouts.",
    icon: RefreshCcw,
    bullets: [
      "Central database holding complete factual records",
      "Cloud backup and sync when you register and log in",
      "Create resumes as snapshots decoupled from the master facts",
    ],
    className: "md:col-span-1 lg:col-span-1",
  },
  {
    title: "Data Ingestors",
    description: "Import your existing profile details and legacy files with zero manual typing.",
    icon: Database,
    bullets: [
      "Extract facts from LinkedIn profile downloads and PDFs",
      "Sync GitHub public projects and contribution calendars",
      "Standard imports to populate your database instantly",
    ],
    className: "md:col-span-1 lg:col-span-1",
  },
  {
    title: "Security & Open Sovereignty",
    description: "Host your own server, audit code parameters, and own your database files.",
    icon: ShieldCheck,
    bullets: [
      "IndexedDB architecture that runs entirely client-side",
      "Authenticated sign-in powered by Better Auth OTP credentials",
      "Open-source MIT database configurations and backend files",
      "Developer API Keys supporting custom automation limits",
    ],
    className: "md:col-span-2 lg:col-span-2",
  },
];

const FeaturesPage = () => {
  const featuresSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Platform Features",
    url: pageUrl,
    description:
      "Comprehensive features list including document editors, portfolios, link cards, and cloud sync.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(featuresSchema) }}
      />

      <PublicPageShell
        eyebrow="Capabilities"
        title="Tools for your professional identity"
        secondaryAction={{ href: "/how-it-works", label: "See How It Works" }}
        primaryAction={{ href: "https://app.veriworkly.com", label: "Start Building" }}
        description="VeriWorkly integrates document editors, custom portfolios, link cards, and local databases under a secure, privacy-first career workspace."
      >
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featureList.map((feat) => {
            const Icon = feat.icon;
            return (
              <Card
                key={feat.title}
                className={`border-border bg-card flex flex-col justify-between rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[6px_6px_0_0_rgba(37,99,235,0.15)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)] ${feat.className}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-black tracking-wider text-blue-600 uppercase dark:text-blue-400">
                      Workspace tool
                    </span>
                  </div>

                  <h2 className="text-foreground text-xl font-bold tracking-tight">{feat.title}</h2>
                  <p className="text-muted text-sm leading-6">{feat.description}</p>

                  <ul className="space-y-2 pt-2">
                    {feat.bullets.map((b) => (
                      <li key={b} className="text-muted flex items-start gap-2 text-xs leading-5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}

          <Card className="border-border bg-card flex flex-col justify-between rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[6px_6px_0_0_rgba(37,99,235,0.15)] md:col-span-1 md:p-8 lg:col-span-1 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  →
                </span>
                <span className="font-mono text-xs font-black tracking-wider text-blue-600 uppercase dark:text-blue-400">
                  Ready?
                </span>
              </div>
              <h2 className="text-foreground text-xl font-bold tracking-tight">
                Create your profile
              </h2>
              <p className="text-muted text-sm leading-6">
                Start building your documents without registering. Upload a file or connect GitHub
                to import data.
              </p>
            </div>
            <div className="pt-6">
              <Button asChild size="sm" variant="secondary" className="w-full justify-center">
                <a href="https://app.veriworkly.com">Open Editor</a>
              </Button>
            </div>
          </Card>
        </section>

        <Card className="border-border bg-card space-y-6 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
          <div className="space-y-2">
            <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Comparison
            </span>
            <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
              Platform difference
            </h2>
            <p className="text-muted text-sm">
              How we build against proprietary subscription-trap career portals.
            </p>
          </div>

          <div className="border-border mt-8 overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-card text-foreground border-border border-b text-xs font-bold tracking-wider uppercase">
                  <th className="p-4">Feature</th>
                  <th className="p-4">Traditional Competitors</th>
                  <th className="p-4 text-blue-600 dark:text-blue-400">VeriWorkly Platform</th>
                </tr>
              </thead>
              <tbody className="divide-border text-muted divide-y">
                <tr>
                  <td className="text-foreground p-4 font-semibold">Layout PDF Downloads</td>
                  <td className="p-4">Hidden behind paywalls and trials</td>
                  <td className="text-foreground p-4 font-semibold">100% Free & Local Compile</td>
                </tr>
                <tr>
                  <td className="text-foreground p-4 font-semibold">Sign-up Gating</td>
                  <td className="p-4">Mandatory (to harvest databases)</td>
                  <td className="text-foreground p-4 font-semibold">No Registration Required</td>
                </tr>
                <tr>
                  <td className="text-foreground p-4 font-semibold">Data Storage Location</td>
                  <td className="p-4">Locked on proprietary servers</td>
                  <td className="text-foreground p-4 font-semibold">Local-First (IndexedDB)</td>
                </tr>
                <tr>
                  <td className="text-foreground p-4 font-semibold">Data Sync Security</td>
                  <td className="p-4">Plaintext analytics profiles</td>
                  <td className="text-foreground p-4 font-semibold">
                    Encrypted Cloud Sync (Optional)
                  </td>
                </tr>
                <tr>
                  <td className="text-foreground p-4 font-semibold">Open Source Audits</td>
                  <td className="p-4">Closed, opaque databases</td>
                  <td className="text-foreground p-4 font-semibold">Auditable MIT Core</td>
                </tr>
                <tr>
                  <td className="text-foreground p-4 font-semibold">Career Assets</td>
                  <td className="p-4">Only Resumes or Cover Letters</td>
                  <td className="text-foreground p-4 font-semibold">
                    Resumes, Letters, Portfolios, Invoices
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </PublicPageShell>
    </>
  );
};

export default FeaturesPage;
