"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-paper)] p-6 text-center">
      <div className="max-w-md rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-7">
        <p className="text-[11px] font-extrabold tracking-[.14em] text-[var(--color-accent)] uppercase">
          Temporary issue
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.06em]">This page could not load.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Your work has not been lost. Try the request again, or return after the service connection
          recovers.
        </p>
        <button
          className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-[var(--color-accent)] px-4 text-xs font-extrabold text-[var(--color-accent-ink)]"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
