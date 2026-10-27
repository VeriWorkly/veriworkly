import { Fragment } from "react";

import MatrixValueCell from "./MatrixValueCell";

import { type Competitor, type CompetitorFeatureMatrix } from "../../types";
import { FEATURE_CATEGORIES, FEATURE_ROWS, VERIWORKLY_MATRIX } from "../../data";

interface FeatureMatrixTableProps {
  competitor: Competitor;
}

/** The scroll wrapper is focusable so keyboard users can reach the right-hand column (WCAG 2.1.1). */
export const FeatureMatrixTable = ({ competitor }: FeatureMatrixTableProps) => (
  <div
    tabIndex={0}
    role="region"
    aria-label={`VeriWorkly and ${competitor.name} feature comparison, scrollable`}
    className="border-border bg-background focus-visible:ring-accent/40 relative overflow-x-auto rounded-3xl border focus-visible:ring-2 focus-visible:outline-none"
  >
    <table className="w-full min-w-180 border-collapse text-left">
      <caption className="sr-only">
        Feature-by-feature comparison between VeriWorkly and {competitor.name}
      </caption>

      <thead>
        <tr className="border-border border-b">
          <th scope="col" className="text-muted px-6 py-5 text-sm font-semibold">
            Feature
          </th>
          <th scope="col" className="text-accent w-[28%] px-6 py-5 text-sm font-semibold">
            VeriWorkly
          </th>
          <th scope="col" className="text-muted w-[28%] px-6 py-5 text-sm font-semibold">
            {competitor.name}
          </th>
        </tr>
      </thead>

      <tbody>
        {FEATURE_CATEGORIES.map((category) => {
          const rows = FEATURE_ROWS.filter((row) => row.category === category.id);

          if (rows.length === 0) return null;

          return (
            <Fragment key={category.id}>
              <tr className="bg-card">
                <th
                  scope="colgroup"
                  colSpan={3}
                  className="px-6 pt-6 pb-3 text-base font-bold tracking-tight"
                >
                  {category.label}
                </th>
              </tr>

              {rows.map((row) => {
                const key = row.key as keyof CompetitorFeatureMatrix;

                return (
                  <tr key={row.key} className="border-border border-t align-top">
                    <th scope="row" className="px-6 py-4 text-left font-normal">
                      <span className="block text-base font-semibold">{row.label}</span>
                      {row.description ? (
                        <span className="text-muted mt-1 block max-w-md text-sm leading-6">
                          {row.description}
                        </span>
                      ) : null}
                    </th>
                    <td className="bg-accent/5 px-6 py-4">
                      <MatrixValueCell value={VERIWORKLY_MATRIX[key]} emphasize />
                    </td>
                    <td className="px-6 py-4">
                      <MatrixValueCell value={competitor.matrix[key]} />
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default FeatureMatrixTable;
