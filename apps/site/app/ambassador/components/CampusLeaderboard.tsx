import { Card } from "@veriworkly/ui";

const topAmbassadors = [
  {
    rank: 1,
    name: "Alex Chen",
    school: "University of Waterloo",
    points: 1950,
    status: "Top Earner",
  },
  {
    rank: 2,
    name: "Sarah Jenkins",
    school: "University of Toronto",
    points: 1820,
    status: "Top Earner",
  },
  {
    rank: 3,
    name: "Michael Zhang",
    school: "MIT",
    points: 1450,
    status: "Active Ambassador",
  },
  {
    rank: 4,
    name: "Emily Rodriguez",
    school: "Stanford University",
    points: 1320,
    status: "Active Ambassador",
  },
  {
    rank: 5,
    name: "David Kim",
    school: "UT Austin",
    points: 980,
    status: "Qualified (250+ pts)",
  },
];

export function CampusLeaderboard() {
  return (
    <Card className="border-border bg-card/40 relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-xs md:p-8">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Standings
          </span>
          <h3 className="text-foreground mt-1 text-2xl font-bold tracking-tight">
            Campus Leaderboard
          </h3>
          <p className="text-muted mt-1 text-sm">
            See this month&apos;s top active ambassadors. Only qualified accounts (250+ points)
            participate.
          </p>
        </div>

        <div className="space-y-3">
          {topAmbassadors.map((ambassador) => {
            return (
              <div
                key={ambassador.name}
                className="flex items-center justify-between rounded-2xl border border-zinc-200/30 bg-zinc-50/50 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold ${
                      ambassador.rank === 1
                        ? "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400"
                        : ambassador.rank === 2
                          ? "bg-zinc-400/10 text-zinc-600 dark:bg-zinc-400/20 dark:text-zinc-300"
                          : ambassador.rank === 3
                            ? "bg-amber-600/10 text-amber-700 dark:bg-amber-600/20 dark:text-amber-400"
                            : "text-muted bg-zinc-100 dark:bg-zinc-800"
                    }`}
                  >
                    {ambassador.rank}
                  </div>
                  <div>
                    <h4 className="text-foreground text-sm font-bold tracking-tight">
                      {ambassador.name}
                    </h4>
                    <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-muted text-[10px]">{ambassador.school}</span>
                      <span className="w-max rounded-sm bg-blue-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-600 dark:text-blue-400">
                        {ambassador.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-foreground block font-mono text-sm font-black">
                    {ambassador.points.toLocaleString()}
                  </span>
                  <span className="text-muted text-[10px] font-semibold tracking-wider uppercase">
                    Points
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-muted rounded-2xl border border-zinc-200/50 bg-zinc-100 p-4 text-xs leading-5 dark:border-zinc-800/80 dark:bg-zinc-900">
          <span className="text-foreground mb-1 block font-bold">Campus Standings Policy:</span>
          - Standings reflect total points earned through qualified classmate invitations and
          content creation.
          <br />- To ensure fair competition and reduce spam, classmates must score at least 250
          engagement points for the invitation to count.
          <br />- All points reset on January 1st of each year.
        </div>
      </div>
    </Card>
  );
}
