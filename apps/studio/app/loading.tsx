import { Container } from "@veriworkly/ui";

export default function AppLoading() {
  return (
    <div className="surface-grid border-border/50 relative mx-4 my-8 flex min-h-[80vh] items-center justify-center overflow-hidden rounded-3xl border md:mx-8 md:my-12">
      <div className="from-background/0 via-background/20 to-background/80 pointer-events-none absolute inset-0 bg-linear-to-b" />

      <Container className="relative flex flex-col items-center py-20 text-center">
        <div className="mb-8 flex h-16 w-16 items-center justify-center">
          <div className="border-accent h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
        </div>

        <p className="text-accent text-sm font-bold tracking-[0.2em] uppercase">Loading</p>

        <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          Preparing your experience
        </h1>

        <p className="text-muted mt-6 max-w-md text-base leading-7">
          Please wait while we fetch the latest data and prepare the page for you.
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-4">
          <div className="bg-accent/5 h-1.5 w-full overflow-hidden rounded-full">
            <div className="bg-accent h-full w-1/3 animate-[loading_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </Container>
    </div>
  );
}
