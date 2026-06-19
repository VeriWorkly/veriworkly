export default function DashboardLoading() {
  return (
    <div className="surface-grid min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 sm:py-10 xl:px-10 select-none">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-1/3 animate-shimmer rounded bg-line/30" />
          <div className="h-4 w-1/4 animate-shimmer rounded bg-line/15" />
        </div>

        {/* Metrics Row Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border-line bg-panel relative flex flex-col justify-between rounded-2xl border p-5 shadow-[4px_6px_0_rgba(17,17,15,0.02)]"
            >
              <div className="space-y-2">
                <div className="h-3 w-1/2 animate-shimmer rounded bg-line/25" />
                <div className="h-6 w-1/3 animate-shimmer rounded bg-line/35" />
              </div>
              <div className="mt-4 h-2 w-full animate-shimmer rounded bg-line/10" />
            </div>
          ))}
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.55fr)]">
          {/* Status/Form Area */}
          <div className="border-line bg-panel flex min-h-[280px] flex-col justify-between rounded-3xl border p-6 shadow-[6px_8px_0_rgba(17,17,15,0.02)] sm:p-8">
            <div className="space-y-4">
              <div className="h-4 w-1/4 animate-shimmer rounded bg-line/30" />
              <div className="h-5 w-1/2 animate-shimmer rounded bg-line/35" />
              <div className="space-y-2">
                <div className="h-3.5 w-full animate-shimmer rounded bg-line/15" />
                <div className="h-3.5 w-5/6 animate-shimmer rounded bg-line/15" />
                <div className="h-3.5 w-4/6 animate-shimmer rounded bg-line/15" />
              </div>
            </div>
            <div className="border-line/60 mt-6 h-12 w-full animate-shimmer rounded-xl border border-dashed bg-line/5" />
          </div>

          {/* Recommendations Sidebar */}
          <div className="border-line bg-panel flex flex-col gap-4 rounded-3xl border p-6 shadow-[6px_8px_0_rgba(17,17,15,0.02)]">
            <div className="h-4 w-1/2 animate-shimmer rounded bg-line/30" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div className="flex items-center gap-3 rounded-xl p-3 bg-line/5 border border-line/45" key={i}>
                  <div className="size-8 animate-shimmer rounded-lg bg-line/20" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 animate-shimmer rounded bg-line/25" />
                    <div className="h-2.5 w-1/2 animate-shimmer rounded bg-line/15" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
