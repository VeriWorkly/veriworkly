import { Container } from "@veriworkly/ui";

export default function RoadmapLoading() {
  return (
    <main className="flex min-h-screen flex-col">
      <Container className="pt-28 pb-20 lg:pt-36">
        <div className="mb-10 space-y-4">
          <div className="bg-accent/10 h-3 w-32 animate-pulse rounded-full" />
          <div className="bg-border h-12 w-full max-w-xl animate-pulse rounded-2xl" />
          <div className="bg-border h-4 w-full max-w-2xl animate-pulse rounded-full" />
        </div>

        <div className="border-border/60 bg-card/40 mb-8 flex items-center justify-between rounded-2xl border p-5">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-border h-9 w-24 animate-pulse rounded-full" />
            ))}
          </div>

          <div className="bg-border h-9 w-40 animate-pulse rounded-full" />
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-border/40 border-border/50 h-24 animate-pulse rounded-3xl border"
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <div className="bg-border/60 h-10 w-3/4 animate-pulse rounded-xl" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="bg-border/40 border-border/50 h-32 animate-pulse rounded-2xl border"
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
