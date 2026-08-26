import ChangelogRichText from "./ChangelogRichText";

import { categoriesFor } from "@/features/changelog/utils/changelog-utils";
import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";

interface ReleaseCategorySectionsProps {
  entry: ChangelogEntry;
}

export const ReleaseCategorySections = ({ entry }: ReleaseCategorySectionsProps) => {
  const categories = categoriesFor(entry);

  if (categories.length === 0)
    return (
      <p className="text-muted text-sm leading-relaxed">
        No itemised changes were recorded for this release. The linked GitHub release and pull
        requests carry the full detail.
      </p>
    );

  return (
    <div className="space-y-8">
      {categories.map(({ category, items, label, icon: Icon, text, border }) => (
        <section key={category} className={`space-y-3 border-l-2 pl-5 ${border}`}>
          <h2
            className={`flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-widest uppercase ${text}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
            <span className="text-muted/70">({items.length})</span>
          </h2>

          <ul className="space-y-2.5">
            {items.map((item, index) => (
              <li
                key={index}
                className="text-muted flex items-start gap-2.5 text-sm leading-relaxed"
              >
                <span
                  aria-hidden="true"
                  className="bg-muted/40 mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                />

                <div className="min-w-0 flex-1">
                  <ChangelogRichText content={item} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default ReleaseCategorySections;
