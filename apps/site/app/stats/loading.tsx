import { Container } from "@veriworkly/ui";

const StatsLoading = () => {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
      <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[130px]" />

      <Container className="relative pt-28 pb-20 lg:pt-36">
        <div className="border-border/40 mb-12 flex flex-col gap-4 border-b pb-8">
          <div className="flex items-center gap-2">
            <div className="bg-accent/30 h-1.5 w-1.5 animate-pulse rounded-full" />
            <div className="bg-border/60 h-3 w-24 animate-pulse rounded-full" />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1 space-y-3">
              <div className="bg-border/60 h-12 w-full max-w-md animate-pulse rounded-2xl" />
              <div className="bg-border/40 h-4 w-full max-w-xl animate-pulse rounded-full" />
            </div>

            <div className="flex gap-2">
              <div className="bg-border/60 h-7 w-28 animate-pulse rounded-md" />
              <div className="bg-border/60 h-7 w-32 animate-pulse rounded-md" />
            </div>
          </div>
        </div>

        <div className="border-border/40 bg-card/20 mb-10 rounded-3xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 space-y-3">
              <div className="bg-border/60 h-7 w-56 animate-pulse rounded-lg" />
              <div className="bg-border/40 h-4 w-full max-w-md animate-pulse rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-fit">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="border-border/30 bg-card/40 h-[72px] min-w-[110px] rounded-2xl border px-4 py-3"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-6">
          <div className="border-border/20 flex flex-col gap-5 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="bg-border/60 h-4 w-28 animate-pulse rounded-md" />
              <div className="bg-border/40 h-3 w-56 animate-pulse rounded-full" />
            </div>

            <div className="bg-border/60 h-9 w-64 animate-pulse rounded-full" />
          </div>

          <div className="border-border/20 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="bg-border/60 h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-border/60 h-9 w-64 animate-pulse rounded-full" />
          </div>

          <div className="border-border/30 bg-card/10 h-20 animate-pulse rounded-3xl border" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-card/25 border-border/30 h-28 animate-pulse rounded-3xl border"
            />
          ))}
        </div>
      </Container>
    </main>
  );
};

export default StatsLoading;
