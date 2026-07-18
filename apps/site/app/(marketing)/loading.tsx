function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-zinc-100 dark:bg-white/5 ${className}`}>
      <div className="motion-reduce:animate-none animate-shimmer absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
    </div>
  );
}

export default function MarketingLoading() {
  return (
    <section className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-black">
      <div className="relative flex w-full flex-col items-center overflow-hidden rounded-4xl border border-black/5 bg-white px-6 pt-28 pb-20 md:pt-32 md:pb-24 dark:border-white/5 dark:bg-[#080808]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.05)_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="pointer-events-none absolute top-0 left-1/2 h-105 w-full max-w-225 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/15" />

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
          <Bone className="h-7 w-32 rounded-full" />

          <Bone className="mt-8 h-11 w-4/5 max-w-lg" />
          <Bone className="mt-4 h-11 w-3/5 max-w-md" />

          <Bone className="mt-8 h-4 w-full max-w-xl rounded-full" />
          <Bone className="mt-2.5 h-4 w-4/5 max-w-md rounded-full" />

          <div className="mt-10 flex gap-4">
            <Bone className="h-14 w-40 rounded-full" />
            <Bone className="h-14 w-40 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 grid w-full max-w-350 gap-4 px-2 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-40 overflow-hidden rounded-3xl border border-zinc-100 bg-white dark:border-white/5 dark:bg-[#0c0c0c]"
          >
            <div className="relative h-full w-full overflow-hidden bg-zinc-50/60 dark:bg-white/2">
              <div
                className="motion-reduce:animate-none animate-shimmer absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-zinc-100 to-transparent dark:via-white/5"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
