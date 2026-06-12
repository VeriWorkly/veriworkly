import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AnalyticsHeader() {
  return (
    <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <p className="text-accent text-xs font-extrabold">Portfolio analytics</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
          A clear view of your reach.
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          See how often your published portfolio is viewed and which websites helped people find it.
        </p>
      </div>
      <Link
        className="bg-accent text-accent-ink hover:bg-accent-strong inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold"
        href="/editor"
      >
        Improve your portfolio <ArrowRight size={13} />
      </Link>
    </header>
  );
}
