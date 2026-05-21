import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Info } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { SectionHeader } from "./SectionHeader";

export const BrandAssetsSection = () => {
  return (
    <section id="brand-assets" className="scroll-mt-24 space-y-8">
      <SectionHeader icon={Info} title="Brand Assets" />

      <Card className="space-y-6 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-lg font-semibold">Primary Logo</p>

            <p className="text-muted text-sm leading-6">
              Use the standard square mark across product surfaces. Keep clear spacing and avoid
              color manipulation.
            </p>
          </div>

          <div className="border-border bg-background rounded-2xl border p-4">
            <Image width={56} height={56} alt="VeriWorkly Logo" src="/veriworkly-logo.png" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            target="_blank"
            className="group block"
            rel="noopener noreferrer"
            href="https://github.com/VeriWorkly/veriworkly/blob/master/apps/site/public/veriworkly-logo.png"
          >
            <div className="border-border bg-background hover:bg-muted/10 rounded-2xl border p-4 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="group-hover:text-accent text-sm font-semibold transition-colors duration-200">
                    Logo path
                  </p>

                  <p className="text-muted mt-1 font-mono text-xs">/veriworkly-logo.png</p>
                </div>

                <ExternalLink
                  className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </div>
            </div>
          </Link>

          <Link
            target="_blank"
            className="group block"
            rel="noopener noreferrer"
            href="https://github.com/VeriWorkly/veriworkly/tree/master/packages/ui"
          >
            <div className="border-border bg-background hover:bg-muted/10 rounded-2xl border p-4 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="group-hover:text-accent text-sm font-semibold transition-colors duration-200">
                    Design references
                  </p>

                  <p className="text-muted mt-1 text-xs">
                    Theme tokens live in @veriworkly/ui styles.
                  </p>
                </div>

                <ExternalLink
                  className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </div>
            </div>
          </Link>
        </div>
      </Card>
    </section>
  );
};
