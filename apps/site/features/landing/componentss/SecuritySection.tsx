import Link from "next/link";

import { Card } from "@veriworkly/ui";

const SecuritySection = () => {
  return (
    <section className="space-y-6" aria-labelledby="security-heading">
      <div className="space-y-2">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
          Trust & Safety
        </p>

        <h2 id="security-heading" className="text-foreground text-3xl font-semibold tracking-tight">
          Built with privacy-first career data security
        </h2>

        <p className="text-muted text-base leading-7">
          Your career data is sensitive. Our platform is designed to keep your information private
          and secure.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h3 className="text-foreground text-lg font-semibold">Local-First Architecture</h3>

          <p className="text-muted text-sm leading-6">
            All your career data is stored locally on your device, making this a privacy-first
            workspace.
          </p>
        </Card>

        <Card className="space-y-4 p-6">
          <h3 className="text-foreground text-lg font-semibold">Minimal Product Analytics</h3>

          <p className="text-muted text-sm leading-6">
            We measure essential product events, like sign-in, dashboard usage, and document syncs,
            to improve reliability and roadmap decisions. We do not sell your career data.
          </p>
        </Card>

        <Card className="space-y-4 p-6">
          <h3 className="text-foreground text-lg font-semibold">Open Source</h3>

          <p className="text-muted text-sm leading-6">
            Our code is transparent and available for review. Anyone can audit our security
            practices.
          </p>
        </Card>

        <Card className="space-y-4 p-6">
          <h3 className="text-foreground text-lg font-semibold">End-to-End Encryption</h3>

          <p className="text-muted text-sm leading-6">
            When sharing documents or portfolios, optional password protection ensures only intended
            recipients can view.
          </p>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <p className="text-muted text-sm">
          For more details, check our{" "}
          <Link href="/security" className="text-accent hover:underline">
            Security Policy
          </Link>
          {" and "}
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
};

export default SecuritySection;
