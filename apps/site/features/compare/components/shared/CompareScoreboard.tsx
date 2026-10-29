import MatrixValueCell from "./MatrixValueCell";

import { type ScoreboardCompetitor } from "../../types";
import { SNAPSHOT_ROWS, VERIWORKLY_MATRIX, VERIWORKLY_PRICE } from "../../data/featureMatrix";

interface CompareScoreboardProps {
  competitor: ScoreboardCompetitor;
  headingLevel?: "h2" | "h3";
}

/** Everything is read from the competitor data, so this, the hub table and the full matrix cannot disagree. */
export const CompareScoreboard = ({
  competitor,
  headingLevel: Heading = "h2",
}: CompareScoreboardProps) => (
  <div data-ui className="bg-card overflow-hidden rounded-3xl">
    <div className="grid grid-cols-2 items-end gap-4 px-5 pt-6 pb-4 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] sm:px-8">
      <Heading className="text-muted col-span-2 text-sm font-semibold sm:col-span-1">
        At a glance
      </Heading>
      <p className="text-accent text-lg font-bold tracking-tight sm:text-xl">VeriWorkly</p>
      <p className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
        <span
          aria-hidden="true"
          style={{ backgroundColor: competitor.color }}
          className="hidden size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white sm:flex"
        >
          {competitor.initials}
        </span>
        <span className="min-w-0 truncate">{competitor.name}</span>
      </p>
    </div>

    <dl>
      {SNAPSHOT_ROWS.map((row) => (
        <div
          key={row.key}
          className="border-border grid grid-cols-2 gap-x-4 gap-y-2 border-t px-5 py-4 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] sm:px-8"
        >
          <dt className="text-muted col-span-2 text-sm leading-6 sm:col-span-1">{row.label}</dt>
          <dd>
            <MatrixValueCell value={VERIWORKLY_MATRIX[row.key]} emphasize />
          </dd>
          <dd>
            <MatrixValueCell value={competitor.matrix[row.key]} />
          </dd>
        </div>
      ))}

      <div className="bg-foreground text-background grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-5 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] sm:px-8">
        <dt className="col-span-2 text-sm leading-6 opacity-70 sm:col-span-1">Price</dt>
        <dd className="text-base leading-6 font-bold">{VERIWORKLY_PRICE}</dd>
        <dd className="text-sm leading-6 font-medium">{competitor.pricingModel}</dd>
      </div>
    </dl>
  </div>
);

export default CompareScoreboard;
