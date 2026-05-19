"use client";

export function MasterSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-8 xl:grid-cols-12">
      <div className="hidden xl:col-span-3 xl:block">
        <div className="bg-muted/20 h-125 w-full rounded-2xl" />
      </div>

      <div className="space-y-6 xl:col-span-9">
        <div className="bg-muted/10 h-20 w-full rounded-2xl" />
        <div className="bg-muted/10 h-150 w-full rounded-2xl" />
      </div>
    </div>
  );
}
