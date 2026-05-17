import Link from "next/link";

import { Button, Container } from "@veriworkly/ui";

export default function RoadmapNotFound() {
  return (
    <main className="flex min-h-screen flex-col">
      <Container className="pt-28 pb-20 lg:pt-36">
        <header className="mb-10 space-y-4">
          <p className="text-accent text-xs font-semibold tracking-[0.24em] uppercase">
            Roadmap Update
          </p>

          <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
            Roadmap category not found
          </h1>

          <p className="text-muted max-w-2xl text-base leading-7">
            The roadmap section or item you&apos;re looking for doesn&apos;t exist or has been
            archived as we ship new features.
          </p>
        </header>

        <section className="border-border bg-accent/5 flex flex-col items-center justify-center rounded-3xl border border-dashed py-20 text-center">
          <div className="bg-accent/10 text-accent mb-6 flex h-20 w-20 items-center justify-center rounded-full">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>

          <h2 className="text-foreground text-2xl font-bold">Lost in the Road</h2>

          <p className="text-muted mt-2 max-w-sm px-6">
            We couldn&apos;t find this specific part of our product journey. Try going back to the
            main roadmap overview.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" variant="primary" className="rounded-full px-8">
              <Link href="/roadmap">Main Roadmap</Link>
            </Button>

            <Button asChild size="lg" variant="ghost" className="rounded-full px-8">
              <Link href="/templates">View Templates</Link>
            </Button>
          </div>
        </section>
      </Container>
    </main>
  );
}
