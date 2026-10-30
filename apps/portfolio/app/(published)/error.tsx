"use client";

// A failed read of a site (the API is down, slow or rate limited) lands here rather than on the
// not-found page, so a visitor is never told a live portfolio does not exist (P-007).
export default function PublishedError({ reset }: { reset: () => void }) {
  return (
    <main className="bg-paper text-ink flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight">This portfolio could not load</h1>
        <p className="text-muted mt-4 text-sm leading-relaxed">
          Something went wrong on our side. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="bg-accent mt-6 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
