import Link from "next/link";

import { PageSection } from "@/components/marketing/PageLayout";

import MatrixValueCell from "../shared/MatrixValueCell";
import CompareCaveatNote from "../shared/CompareCaveatNote";

import { COMPETITORS, SNAPSHOT_ROWS, VERIWORKLY_MATRIX, VERIWORKLY_PRICE } from "../../data";

/** Every cell comes from the competitor data; never keep a hand-typed copy here, it drifts. */
const CompareQuickMatrix = () => (
  <PageSection
    id="table"
    tone="card"
    title="All seven at a glance."
    lede="The rules that decide whether you can finish an application on a free plan, plus the starting price."
  >
    <div
      tabIndex={0}
      role="region"
      aria-label="Resume builder comparison table, scrollable"
      className="border-border bg-background focus-visible:ring-accent/40 reveal relative overflow-x-auto rounded-3xl border focus-visible:ring-2 focus-visible:outline-none"
    >
      <table className="w-full min-w-260 border-collapse text-left">
        <caption className="sr-only">
          VeriWorkly compared with {COMPETITORS.map((c) => c.name).join(", ")}
        </caption>

        <thead>
          <tr className="border-border border-b">
            <th scope="col" className="text-muted px-6 py-5 text-sm font-semibold">
              Builder
            </th>
            {SNAPSHOT_ROWS.map((row) => (
              <th key={row.key} scope="col" className="text-muted px-5 py-5 text-sm font-semibold">
                {row.label}
              </th>
            ))}
            <th scope="col" className="text-muted px-6 py-5 text-sm font-semibold">
              Price
            </th>
          </tr>
        </thead>

        <tbody>
          <tr className="bg-accent/5 align-top">
            <th scope="row" className="text-accent px-6 py-5 text-left text-lg font-bold">
              VeriWorkly
            </th>
            {SNAPSHOT_ROWS.map((row) => (
              <td key={row.key} className="px-5 py-5">
                <MatrixValueCell value={VERIWORKLY_MATRIX[row.key]} emphasize />
              </td>
            ))}
            <td className="px-6 py-5 text-sm leading-6 font-bold">{VERIWORKLY_PRICE}</td>
          </tr>

          {COMPETITORS.map((competitor) => (
            <tr key={competitor.id} className="border-border border-t align-top">
              <th scope="row" className="px-6 py-5 text-left">
                <Link
                  href={`/compare/${competitor.id}`}
                  className="hover:text-accent focus-visible:ring-accent/40 rounded text-lg font-bold underline-offset-4 transition-colors duration-200 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  {competitor.name}
                </Link>
              </th>
              {SNAPSHOT_ROWS.map((row) => (
                <td key={row.key} className="px-5 py-5">
                  <MatrixValueCell value={competitor.matrix[row.key]} />
                </td>
              ))}
              <td className="px-6 py-5 text-sm leading-6 font-medium">{competitor.pricingModel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <CompareCaveatNote className="mt-6" />
  </PageSection>
);

export default CompareQuickMatrix;
