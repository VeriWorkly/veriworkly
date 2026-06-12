import { Globe2, Info } from "lucide-react";

export interface AnalyticsReferrersProps {
  referrers?: Array<{ host: string; count: number }>;
}

export function AnalyticsReferrers({ referrers = [] }: AnalyticsReferrersProps) {
  return (
    <aside className="border-line bg-panel rounded-[2rem] border p-6">
      <p className="text-muted text-xs font-extrabold">Discovery</p>
      <h2 className="mt-1 text-xl font-black tracking-[-.04em]">Referring sites</h2>
      <p className="text-muted mt-2 text-xs leading-5">
        We store only the referring website hostname with an aggregated daily view count.
      </p>
      <div className="mt-5 space-y-2">
        {referrers.length ? (
          referrers.map((item) => (
            <div className="bg-paper flex items-center gap-3 rounded-xl px-3 py-3" key={item.host}>
              <span className="bg-panel text-accent grid size-8 place-items-center rounded-lg">
                <Globe2 size={14} />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-bold">{item.host}</span>
              <span className="text-xs font-black tabular-nums">{item.count}</span>
            </div>
          ))
        ) : (
          <p className="bg-paper text-muted rounded-xl p-4 text-xs leading-5">
            No referring websites have been recorded yet. Direct visits do not include a referring
            hostname.
          </p>
        )}
      </div>
      <div className="border-line text-muted mt-5 flex gap-2 border-t pt-4 text-[11px] leading-5">
        <Info size={14} className="text-accent mt-0.5 shrink-0" />
        <p>No personal visitor profiles, cookies, or page-level behavior are shown here.</p>
      </div>
    </aside>
  );
}
