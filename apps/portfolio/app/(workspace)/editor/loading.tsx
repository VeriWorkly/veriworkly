import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function EditorLoading() {
  return (
    <div className="workspace-theme bg-paper-2 text-ink flex h-dvh min-h-0 flex-col overflow-hidden select-none">
      {/* Mock EditorCommandBar */}
      <header className="z-40 grid min-h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 bg-[#171717] px-3 text-white sm:px-4">
        <div className="flex items-center gap-2">
          <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly logo" priority />
          <span className="hidden text-sm font-bold sm:block">VeriWorkly</span>
        </div>
        <div className="min-w-0 text-center">
          <p className="text-sm font-extrabold">Portfolio editor</p>
          <div className="animate-shimmer mx-auto mt-1 h-3 w-28 rounded bg-white/10" />
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <div className="animate-shimmer h-8 w-20 rounded-lg bg-white/10 sm:w-24" />
          <div className="animate-shimmer h-8 w-16 rounded-lg bg-white/10 sm:w-20" />
        </div>
      </header>

      {/* Mock Editor Workspace Grid */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[15rem_minmax(23rem,31rem)_minmax(0,1fr)]">
        {/* Column 1: StructureRail Skeleton */}
        <aside className="border-line bg-panel hidden flex-col border-r lg:flex">
          <div className="border-line flex min-h-12 items-center justify-between border-b px-4">
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase opacity-60">
              Structure
            </span>
            <div className="animate-shimmer bg-line/20 size-4 rounded" />
          </div>
          <div className="flex-1 space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div className="flex items-center gap-3 rounded-lg p-2" key={i}>
                <div className="animate-shimmer bg-line/30 size-4 rounded" />
                <div className="animate-shimmer bg-line/20 h-3 w-2/3 rounded" />
              </div>
            ))}
          </div>
        </aside>

        {/* Column 2: ContentCanvas Skeleton */}
        <aside className="border-line bg-panel-raised hidden flex-col border-r lg:flex">
          <div className="border-line flex min-h-12 items-center justify-between border-b px-4">
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase opacity-60">
              Canvas Editor
            </span>
          </div>
          <div className="flex-1 space-y-6 p-6">
            <div className="space-y-2">
              <div className="animate-shimmer bg-line/30 h-3.5 w-1/3 rounded" />
              <div className="animate-shimmer bg-line/10 h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="animate-shimmer bg-line/30 h-3.5 w-1/4 rounded" />
              <div className="animate-shimmer bg-line/10 h-20 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="animate-shimmer bg-line/30 h-3.5 w-1/2 rounded" />
              <div className="animate-shimmer bg-line/10 h-10 w-full rounded-xl" />
            </div>
          </div>
        </aside>

        {/* Column 3: PreviewStage Skeleton */}
        <main className="bg-paper-2 relative flex flex-col items-center justify-center p-6">
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
            <div className="bg-panel border-line relative flex size-14 items-center justify-center rounded-2xl border shadow-sm">
              <Loader2 className="text-accent size-6 animate-spin" />
            </div>
            <span className="text-muted font-mono text-[10px] font-bold tracking-widest uppercase">
              Spinning up editor environment
            </span>
          </div>

          {/* Simulated Browser Frame */}
          <div className="border-line bg-panel flex h-full w-full max-w-4xl flex-col rounded-2xl border opacity-25 shadow-sm">
            <div className="border-line flex h-9 items-center gap-1.5 border-b px-4">
              <div className="bg-line/60 size-2.5 rounded-full" />
              <div className="bg-line/60 size-2.5 rounded-full" />
              <div className="bg-line/60 size-2.5 rounded-full" />
              <div className="bg-paper border-line mx-auto h-5 w-48 rounded border" />
            </div>
            <div className="flex-1 space-y-4 p-6">
              <div className="bg-line/20 h-12 w-2/3 rounded-xl" />
              <div className="bg-line/15 h-4 w-full rounded" />
              <div className="bg-line/15 h-4 w-5/6 rounded" />
              <div className="grid grid-cols-2 gap-4 pt-6">
                <div className="bg-line/10 h-32 rounded-2xl" />
                <div className="bg-line/10 h-32 rounded-2xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
