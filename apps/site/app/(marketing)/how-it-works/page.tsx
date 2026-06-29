import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Card, Button } from "@veriworkly/ui";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Database, Cpu, ShieldCheck, Lock, UploadCloud } from "lucide-react";

const pageUrl = `${siteConfig.url}/how-it-works`;
const pageOgImage = `${siteConfig.url}/og/how-it-works-page-og.png`;

export const metadata: Metadata = {
  title: `How It Works: Privacy-First AI Career Builder | ${siteConfig.shortName}`,
  description:
    "Learn how our local-first storage, client-side WebAssembly compilers, privacy-first AI copywriting engine, and secure cloud sync protect your data.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `How It Works: Privacy-First AI Career Builder | ${siteConfig.shortName}`,
    description:
      "A deep dive into local browser databases, offline compilers, stateless AI credit engines, and secure cloud synchronization.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "VeriWorkly Platform Architecture",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `How It Works: Privacy-First AI Career Builder | ${siteConfig.shortName}`,
    description:
      "Explore how browser databases, offline compilers, and stateless AI engines let you control your career credentials.",
    images: [pageOgImage],
  },
};

const steps = [
  {
    step: "01",
    title: "Local browser storage",
    description:
      "Your documents are saved inside your browser's private database (IndexedDB). No text leaves your machine by default, allowing you to use the editors, templates, and features without registering an account.",
    icon: Database,
  },
  {
    step: "02",
    title: "Document sandbox",
    description:
      "Your Master Profile holds your background records. When you start a document, the editor pulls a snapshot from your profile. Changes inside templates remain sandboxed and will not overwrite your master records.",
    icon: ShieldCheck,
  },
  {
    step: "03",
    title: "Browser compilers",
    description:
      "When you download a resume or cover letter PDF, the compilation happens inside your browser tab using WebAssembly. Your personal facts are never processed on external servers.",
    icon: Cpu,
  },
  {
    step: "04",
    title: "Secure cloud backups",
    description:
      "If you register and log in, your Master Profile and sandbox documents are backed up and synchronized in the cloud. Your account is secured using passwordless OTP credentials.",
    icon: Lock,
  },
  {
    step: "05",
    title: "Subdomain routing",
    description:
      "Publishing a portfolio pushes metadata to our edge router. The system dynamically maps visitors (e.g. name.veriworkly.com) and displays your web portfolio page without cookies.",
    icon: UploadCloud,
  },
];

const HowItWorksPage = () => {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Build a Sovereign Career Portfolio",
    description:
      "Step-by-step overview of local-first editing, browser compilers, and optional cloud sync.",
    step: steps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.title,
      text: s.description,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <PublicPageShell
        eyebrow="Architecture"
        title="Privacy built into the architecture"
        secondaryAction={{ href: "/about", label: "Read Our Story" }}
        primaryAction={{ href: "https://app.veriworkly.com", label: "Open Editor" }}
        description="We use browser security sandboxes to protect your data. See how our local-first database, client compilers, and optional authenticated cloud sync operate together."
      >
        <section className="space-y-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.step}
                className="border-border bg-card grid gap-6 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[6px_6px_0_0_rgba(37,99,235,0.15)] md:p-8 lg:grid-cols-[120px_1fr] lg:items-center dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]"
              >
                <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-2">
                  <span className="font-mono text-3xl font-black text-blue-600 dark:text-blue-400">
                    {s.step}
                  </span>
                  <span className="font-mono text-xs font-black tracking-wider text-blue-600 uppercase dark:text-blue-400">
                    Phase
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h2 className="text-foreground text-xl font-bold tracking-tight">{s.title}</h2>
                  </div>
                  <p className="text-muted max-w-4xl text-sm leading-7">{s.description}</p>
                </div>
              </Card>
            );
          })}
        </section>

        <Card className="border-border bg-card space-y-4 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
          <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Audits
          </span>
          <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
            Open and auditable codebase
          </h2>
          <p className="text-muted text-sm leading-7">
            A privacy statement is only as good as the code that executes it. Because VeriWorkly is
            open-source, developers, job seekers, and security engineers can audit our database
            settings, compile parameters, and routing scripts. You can run the entire platform
            locally, inspect the configuration, or self-host your own database endpoints.
          </p>
          <div className="pt-2">
            <Button asChild size="md" variant="secondary">
              <a href={siteConfig.links.github} target="_blank" rel="noreferrer">
                Explore GitHub Repository
              </a>
            </Button>
          </div>
        </Card>
      </PublicPageShell>
    </>
  );
};

export default HowItWorksPage;
