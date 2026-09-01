import { type ChangelogStats } from "@/features/changelog/services/changelog-backend";

const ChangelogStatsGrid = ({ stats }: { stats: ChangelogStats | null }) => {
  const cards = [
    {
      label: "Latest Version",
      value: stats?.latest ? `v${stats.latest.version}` : "-",
      dot: "bg-accent",
    },
    {
      label: "Total Releases",
      value: stats?.totalEntries ?? 0,
      dot: "bg-emerald-500",
    },
    {
      label: "Contributors",
      value: stats?.contributorCount ?? 0,
      dot: "bg-pink-500",
    },
    {
      label: "Minor Releases",
      value: stats?.minor ?? 0,
      dot: "bg-blue-500",
    },
    {
      label: "Patch Releases",
      value: stats?.patch ?? 0,
      dot: "bg-amber-500",
    },
  ];

  return (
    <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group border-border/40 bg-card/30 hover:border-border/60 hover:bg-card/50 relative overflow-hidden rounded-2xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-muted font-mono text-[10px] font-bold tracking-wider uppercase">
              {card.label}
            </span>

            <span className={`h-1.5 w-1.5 rounded-full ${card.dot}`} />
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-foreground font-sans text-3xl font-bold tracking-tight tabular-nums">
              {card.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChangelogStatsGrid;
