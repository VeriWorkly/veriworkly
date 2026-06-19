export default function DashboardLoading() {
  return (
    <div className="surface-grid min-h-[calc(100dvh-4.25rem)] px-4 py-8 select-none sm:px-6 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="animate-shimmer bg-line/30 h-8 w-1/3 rounded" />
          <div className="animate-shimmer bg-line/15 h-4 w-1/4 rounded" />
        </div>

        {/* Metrics Row Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border-line bg-panel relative flex flex-col justify-between rounded-2xl border p-5 shadow-[4px_6px_0_rgba(17,17,15,0.02)]"
            >
              <div className="space-y-2">
                <div className="animate-shimmer bg-line/25 h-3 w-1/2 rounded" />
                <div className="animate-shimmer bg-line/35 h-6 w-1/3 rounded" />
              </div>
              <div className="animate-shimmer bg-line/10 mt-4 h-2 w-full rounded" />
            </div>
          ))}
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.55fr)]">
          {/* Status/Form Area */}
          <div className="border-line bg-panel flex min-h-[280px] flex-col justify-between rounded-3xl border p-6 shadow-[6px_8px_0_rgba(17,17,15,0.02)] sm:p-8">
            <div className="space-y-4">
              <div className="animate-shimmer bg-line/30 h-4 w-1/4 rounded" />
              <div className="animate-shimmer bg-line/35 h-5 w-1/2 rounded" />
              <div className="space-y-2">
                <div className="animate-shimmer bg-line/15 h-3.5 w-full rounded" />
                <div className="animate-shimmer bg-line/15 h-3.5 w-5/6 rounded" />
                <div className="animate-shimmer bg-line/15 h-3.5 w-4/6 rounded" />
              </div>
            </div>
            <div className="border-line/60 animate-shimmer bg-line/5 mt-6 h-12 w-full rounded-xl border border-dashed" />
          </div>

          {/* Recommendations Sidebar */}
          <div className="border-line bg-panel flex flex-col gap-4 rounded-3xl border p-6 shadow-[6px_8px_0_rgba(17,17,15,0.02)]">
            <div className="animate-shimmer bg-line/30 h-4 w-1/2 rounded" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  className="bg-line/5 border-line/45 flex items-center gap-3 rounded-xl border p-3"
                  key={i}
                >
                  <div className="animate-shimmer bg-line/20 size-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="animate-shimmer bg-line/25 h-3 w-3/4 rounded" />
                    <div className="animate-shimmer bg-line/15 h-2.5 w-1/2 rounded" />
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
