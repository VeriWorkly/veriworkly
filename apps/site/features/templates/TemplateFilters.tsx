"use client";

type Props = {
  familyOptions: string[];
  layoutOptions: string[];
  selectedFamily: string;
  selectedLayout: string;
  onFamilyChange: (family: string) => void;
  onLayoutChange: (layout: string) => void;
};

const withAll = (values: string[]) => ["All", ...values];

const buttonClass = (active: boolean, activeClass: string) =>
  [
    "cursor-pointer rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none",
    active
      ? activeClass
      : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-zinc-400 dark:hover:text-white",
  ].join(" ");

/**
 * Filtering is view state over a list already rendered on the page, so these are
 * buttons rather than links - no navigation, no server round-trip. `aria-pressed`
 * carries the on/off state that the old active-link styling only conveyed visually.
 */
const TemplateFilters = ({
  familyOptions,
  layoutOptions,
  selectedFamily,
  selectedLayout,
  onFamilyChange,
  onLayoutChange,
}: Props) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-[#0c0c0c]">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by style system">
        {withAll(familyOptions).map((family) => {
          const active = selectedFamily === family;

          return (
            <button
              key={family}
              type="button"
              aria-pressed={active}
              onClick={() => onFamilyChange(family)}
              className={buttonClass(active, "border-blue-600 bg-blue-600 text-white")}
            >
              {family}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by layout">
        {withAll(layoutOptions).map((layout) => {
          const active = selectedLayout === layout;

          return (
            <button
              key={layout}
              type="button"
              aria-pressed={active}
              onClick={() => onLayoutChange(layout)}
              className={buttonClass(
                active,
                "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950",
              )}
            >
              {layout}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateFilters;
