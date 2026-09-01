import { Fragment } from "react";

import MatrixValueCell from "./MatrixValueCell";

import { type Competitor, type CompetitorFeatureMatrix } from "../../types";
import { FEATURE_CATEGORIES, FEATURE_ROWS, VERIWORKLY_MATRIX } from "../../data";

interface FeatureMatrixTableProps {
  competitor: Competitor;
}

export const FeatureMatrixTable = ({ competitor }: FeatureMatrixTableProps) => {
  return (
    <div className="border-border/60 bg-card/40 overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-145 border-collapse text-left">
          <caption className="sr-only">
            Detailed feature-by-feature comparison between VeriWorkly and {competitor.name}
          </caption>

          <thead>
            <tr className="border-border/60 bg-muted/4 border-b">
              <th className="text-muted p-4 font-mono text-[11px] font-bold tracking-wider uppercase sm:p-5">
                Feature / Capability
              </th>

              <th className="text-accent bg-accent/6 border-accent/20 w-44 border-x p-4 font-mono text-[11px] font-bold tracking-wider uppercase sm:w-56 sm:p-5">
                <div className="flex items-center gap-2">
                  <span className="bg-accent size-2 animate-pulse rounded-full" />
                  <span>VeriWorkly</span>
                </div>
              </th>

              <th className="text-muted w-44 p-4 font-mono text-[11px] font-bold tracking-wider uppercase sm:w-56 sm:p-5">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: competitor.color }}
                  />
                  <span>{competitor.shortName}</span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-border/40 divide-y">
            {FEATURE_CATEGORIES.map((category) => {
              const rowsInCategory = FEATURE_ROWS.filter((row) => row.category === category.id);

              if (rowsInCategory.length === 0) return null;

              return (
                <Fragment key={category.id}>
                  <tr className="bg-muted/6 border-border/60 border-t border-b">
                    <td
                      colSpan={3}
                      className="text-foreground/90 px-4 py-2.5 font-mono text-[10px] font-bold tracking-widest uppercase sm:px-5"
                    >
                      {category.label}
                    </td>
                  </tr>

                  {rowsInCategory.map((row, idx) => {
                    const rowKey = row.key as keyof CompetitorFeatureMatrix;

                    const veriValue = VERIWORKLY_MATRIX[rowKey];
                    const compValue = competitor.matrix[rowKey];

                    return (
                      <tr
                        key={row.key}
                        className={`hover:bg-muted/3 transition-colors ${
                          idx % 2 === 0 ? "bg-transparent" : "bg-muted/1.5"
                        }`}
                      >
                        <td className="p-4 align-top sm:p-5">
                          <p className="text-foreground text-sm leading-snug font-medium">
                            {row.label}
                          </p>

                          {row.description && (
                            <p className="text-muted mt-1 max-w-sm text-xs leading-relaxed">
                              {row.description}
                            </p>
                          )}
                        </td>

                        <td className="bg-accent/4 border-accent/20 border-x p-4 align-top sm:p-5">
                          <MatrixValueCell value={veriValue} emphasize />
                        </td>

                        <td className="p-4 align-top sm:p-5">
                          <MatrixValueCell value={compValue} />
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
    </div>
  );
};

export default FeatureMatrixTable;
