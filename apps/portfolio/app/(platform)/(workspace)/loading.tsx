/** A plain skeleton of the workspace while it loads: no progress it cannot measure. */
export default function LoadingPage() {
  return (
    <div
      className="bg-paper min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]"
      role="status"
      aria-label="Loading your workspace"
    >
      <aside className="border-line bg-panel hidden border-r p-3 lg:block">
        <div className="bg-line/25 animate-shimmer mb-6 h-10 rounded-lg" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-line/15 animate-shimmer h-8 rounded-lg" />
          ))}
        </div>
      </aside>
      <main className="px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="bg-line/25 animate-shimmer h-8 w-1/2 rounded" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-line bg-panel h-24 rounded-xl border" />
            ))}
          </div>
          <div className="border-line bg-panel h-72 rounded-xl border" />
        </div>
      </main>
    </div>
  );
}
