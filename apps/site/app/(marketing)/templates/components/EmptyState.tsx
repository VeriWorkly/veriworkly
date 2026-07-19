import Link from "next/link";
import { SearchX } from "lucide-react";

const EmptyState = ({ resetHref = "/templates" }: { resetHref?: string }) => {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center dark:border-zinc-700 dark:bg-white/2">
      <SearchX className="h-8 w-8 text-zinc-400 dark:text-zinc-600" aria-hidden="true" />

      <p className="text-base font-medium text-zinc-900 dark:text-white">
        No templates match these filters.
      </p>

      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Try switching family or layout to see more options.
      </p>

      <Link
        href={resetHref}
        className="mt-1 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Reset filters
      </Link>
    </div>
  );
};

export default EmptyState;
