import { Container } from "@veriworkly/ui";

export default function RoadmapLoading() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />

      <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-[600px] w-[600px] rounded-full blur-[130px]" />

      <Container className="pt-28 pb-20 lg:pt-36">
        <div className="border-border/40 mb-12 space-y-4 border-b pb-8">
          <div className="flex items-center gap-2">
            <div className="bg-accent/30 h-1.5 w-1.5 animate-pulse rounded-full" />
            <div className="bg-border/60 h-3 w-28 animate-pulse rounded-full" />
          </div>

          <div className="bg-border/60 h-12 w-full max-w-xl animate-pulse rounded-2xl" />
          <div className="bg-border/40 h-4 w-full max-w-2xl animate-pulse rounded-full" />
        </div>

        <div className="border-border/40 bg-card/30 mb-10 flex flex-col gap-4 rounded-3xl border p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-border/60 h-8 w-24 animate-pulse rounded-full" />
            ))}
          </div>

          <div className="bg-border/60 h-8 w-40 animate-pulse rounded-full" />
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card/35 border-border/40 h-28 animate-pulse rounded-2xl border"
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-border/30 bg-muted/5 flex min-h-[350px] flex-col gap-5 rounded-3xl border p-4 sm:p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-border/60 h-5 w-5 animate-pulse rounded-full" />
                  <div className="bg-border/60 h-5 w-24 animate-pulse rounded-lg" />
                </div>

                <div className="bg-border/60 h-5 w-8 animate-pulse rounded-md" />
              </div>

              <div className="space-y-4">
                {[1, 2].map((j) => (
                  <div
                    key={j}
                    className="bg-card border-border/40 h-32 animate-pulse rounded-2xl border"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
