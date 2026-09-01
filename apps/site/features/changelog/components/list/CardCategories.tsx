import { categoryCountsFor } from "@/features/changelog/utils/changelog-utils";
import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";

interface CardCategoriesProps {
  entry: ChangelogEntry;
}

export const CardCategories = ({ entry }: CardCategoriesProps) => {
  const counts = categoryCountsFor(entry);

  if (counts.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      {counts.map(({ category, count, label, dot, text }) => (
        <li key={category} className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
          <span className={`font-mono text-[11px] font-bold tracking-wide ${text}`}>{count}</span>
          <span className="text-muted font-mono text-[11px] tracking-wide">{label}</span>
        </li>
      ))}
    </ul>
  );
};

export default CardCategories;
