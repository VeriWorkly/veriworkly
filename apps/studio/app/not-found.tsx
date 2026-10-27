import Link from "next/link";

import { Button, Container } from "@veriworkly/ui";

const NotFound = () => {
  return (
    <main className="surface-grid flex min-h-screen items-center justify-center">
      <Container className="flex flex-col items-center text-center">
        <p className="text-accent text-sm font-bold tracking-[0.2em] uppercase">404 Error</p>

        <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          Page not found
        </h1>

        <p className="text-muted mt-6 max-w-md text-base leading-7">
          We could not find that page. It may have moved, or the address may be mistyped.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild variant="primary">
            <Link href="/">Go back to the dashboard</Link>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/templates">View Templates</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
};

export default NotFound;
