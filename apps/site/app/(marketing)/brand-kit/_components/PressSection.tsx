import Link from "next/link";
import { Mail, Newspaper } from "lucide-react";

import { Card } from "@veriworkly/ui";
import { pressFacts } from "@/config/brand";

import BrandSectionHeader from "./BrandSectionHeader";

const FACTS = [
  { label: "Product name", value: pressFacts.spelling },
  { label: "Created by", value: pressFacts.creator },
  { label: "Website", value: pressFacts.website },
  { label: "Licence", value: `${pressFacts.licence} - ${pressFacts.model}` },
];

const PressSection = () => {
  return (
    <section id="press" className="scroll-mt-24 space-y-8">
      <BrandSectionHeader
        icon={Newspaper}
        title="Press & Contact"
        description="Everything you need to attribute VeriWorkly correctly, and a real person to ask when it isn't covered here."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-5 p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Quick facts
          </p>

          <dl className="divide-border divide-y">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-wrap gap-x-4 gap-y-1 py-3 first:pt-0">
                <dt className="text-muted w-32 shrink-0 text-sm">{fact.label}</dt>
                <dd className="text-foreground min-w-0 text-sm font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {pressFacts.socials.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent focus-visible:ring-accent rounded text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {social.label} <span className="text-muted font-normal">{social.handle}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col justify-between gap-6 p-8">
          <div className="space-y-3">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              Media enquiries
            </p>

            <p className="text-sm leading-relaxed">
              For interviews, review units, or anything about brand usage that isn&apos;t answered
              on this page, email us directly. We answer press mail ourselves - there is no agency
              in between.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href={`mailto:${pressFacts.email}?subject=${encodeURIComponent("Press enquiry - VeriWorkly")}`}
              className="bg-accent text-accent-foreground focus-visible:ring-accent inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Mail className="size-4" aria-hidden="true" />
              {pressFacts.email}
            </Link>

            <p className="text-muted text-xs leading-relaxed">
              Prefer a pull request? The source for this page and every asset on it lives at{" "}
              <Link
                href={pressFacts.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent font-semibold hover:underline"
              >
                github.com/VeriWorkly
              </Link>
              .
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default PressSection;
