import Link from "next/link";

const EmptyState = ({ resetHref = "/templates" }: { resetHref?: string }) => {
  return (
    <div className="border-border bg-card rounded-xl border p-6">
      <p className="text-foreground text-base font-medium">No templates match these filters.</p>

      <p className="text-muted mt-1 text-sm">Try switching family or layout to see more options.</p>

      <Link href={resetHref} className="text-accent mt-3 inline-block text-sm font-medium">
        Reset filters
      </Link>
    </div>
  );
};

export default EmptyState;
