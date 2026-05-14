export default function DashboardLoading() {
  return (
    <div className="space-y-6 py-8">
      <div className="border-border bg-card space-y-3 rounded-3xl border p-6">
        <div className="bg-border h-3 w-32 animate-pulse rounded" />
        <div className="bg-border h-8 w-48 animate-pulse rounded" />
        <div className="bg-border h-4 w-full max-w-lg animate-pulse rounded" />
        <div className="bg-border mt-3 h-10 w-36 animate-pulse rounded-full" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-border bg-card space-y-4 rounded-3xl border p-6">
            <div className="bg-border h-6 w-3/4 animate-pulse rounded" />
            <div className="bg-border h-4 w-1/2 animate-pulse rounded" />
            <div className="bg-border h-4 w-2/3 animate-pulse rounded" />
            <div className="bg-border h-4 w-1/2 animate-pulse rounded" />
            <div className="bg-border mt-4 h-11 w-32 animate-pulse rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
