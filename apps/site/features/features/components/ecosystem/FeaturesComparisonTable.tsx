import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, X } from "lucide-react";

import { siteConfig } from "@/config/site";

import { PageSection, TYPE } from "@/components/marketing/PageLayout";

import { COMPARISON_ROWS } from "../../data";

const RESOURCES = [
  {
    title: "Documentation",
    detail: "Templates, Master Profile schemas, ATS rules and deployment.",
    href: siteConfig.links.docs,
    external: true,
  },
  {
    title: "Source on GitHub",
    detail: "MIT-licensed. Check our privacy claims, self-host or contribute.",
    href: siteConfig.links.github,
    external: true,
  },
  {
    title: "API and JSON schema",
    detail: "Export document data, create scoped tokens, render portfolios.",
    href: `${siteConfig.links.docs}/api-reference`,
    external: true,
  },
  {
    title: "ATS Engine",
    detail: "The open-source engine behind our checker, for your own product.",
    href: "/ats-engine",
    external: false,
  },
];

export const FeaturesComparisonTable = () => (
  <PageSection
    id="compare"
    title="How we compare."
    lede="Against traditional resume websites: clean tools, plain policies, and no paywall when you click download."
  >
    {/* A horizontally scrollable region must be keyboard-reachable (WCAG 2.1.1), so the container takes focus and names itself. */}
    <div
      tabIndex={0}
      role="region"
      aria-label="Feature comparison, scrollable"
      className="reveal bg-card focus-visible:ring-accent/40 relative hidden overflow-x-auto rounded-3xl focus-visible:ring-2 focus-visible:outline-none md:block"
    >
      <table className="w-full min-w-180 border-collapse text-left">
        <caption className="sr-only">
          Feature comparison between VeriWorkly and traditional resume websites
        </caption>
        <thead>
          <tr className="text-muted text-sm">
            <th scope="col" className="w-[30%] px-6 py-5 font-semibold">
              Feature
            </th>
            <th scope="col" className="w-[35%] px-6 py-5 font-semibold">
              Traditional resume sites
            </th>
            <th scope="col" className="text-accent bg-accent/8 w-[35%] px-6 py-5 font-semibold">
              VeriWorkly
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.feature} className="border-border border-t align-top">
              <th scope="row" className="px-6 py-4 text-base font-semibold">
                {row.feature}
              </th>
              <td className="text-muted px-6 py-4 text-base leading-7">
                <span className="flex gap-2.5">
                  <X aria-hidden="true" className="text-destructive mt-1.5 size-4 shrink-0" />
                  {row.competitor}
                </span>
              </td>
              <td className="bg-accent/8 px-6 py-4 text-base leading-7 font-medium">
                <span className="flex gap-2.5">
                  <Check aria-hidden="true" className="text-success mt-1.5 size-4 shrink-0" />
                  {row.veriworkly}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <ul className="reveal bg-card overflow-hidden rounded-3xl md:hidden">
      {COMPARISON_ROWS.map((row) => (
        <li key={row.feature} className="border-border border-t px-5 py-5 first:border-t-0">
          <p className="text-base font-semibold">{row.feature}</p>
          <p className="mt-3 flex gap-2.5 text-base leading-7 font-medium">
            <Check aria-hidden="true" className="text-success mt-1.5 size-4 shrink-0" />
            <span>
              <span className="sr-only">VeriWorkly: </span>
              {row.veriworkly}
            </span>
          </p>
          <p className="text-muted mt-1 flex gap-2.5 text-base leading-7">
            <X aria-hidden="true" className="text-destructive mt-1.5 size-4 shrink-0" />
            <span>
              <span className="sr-only">Traditional resume sites: </span>
              {row.competitor}
            </span>
          </p>
        </li>
      ))}
    </ul>

    <div id="developers" className="reveal mt-16 scroll-mt-24">
      <h3 className={`${TYPE.title} text-balance`}>
        Don&apos;t take the table&apos;s word for it.
      </h3>
      <ul className="mt-6 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        {RESOURCES.map((resource) => {
          const Arrow = resource.external ? ArrowUpRight : ArrowRight;

          return (
            <li key={resource.title} className="border-border border-t">
              <Link
                href={resource.href}
                {...(resource.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group focus-visible:ring-accent/40 block rounded-xl py-5 focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="group-hover:text-accent flex items-center gap-2 text-lg font-bold tracking-tight transition-colors duration-200">
                  {resource.title}
                  <Arrow
                    aria-hidden="true"
                    className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-muted mt-2 block text-base leading-7 text-pretty">
                  {resource.detail}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  </PageSection>
);

export default FeaturesComparisonTable;
