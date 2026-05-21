import Link from "next/link";
import { Frown } from "lucide-react";

import { Button, Container } from "@veriworkly/ui";

const NotFound = () => {
  return (
    <main className="surface-grid flex min-h-screen items-center justify-center">
      <Container className="flex flex-col items-center text-center">
        <div className="bg-accent/10 text-accent shadow-accent/5 mb-8 flex h-24 w-24 items-center justify-center rounded-full shadow-xl">
          <Frown className="h-12 w-12" />
        </div>

        <p className="text-accent text-sm font-bold tracking-[0.2em] uppercase">404 Error</p>

        <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          Page not found
        </h1>

        <p className="text-muted mt-6 max-w-md text-base leading-7">
          Sorry, we couldn’t find the page you’re looking for. It might have been moved, or the URL
          might be incorrect.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild variant="primary">
            <Link href="/">Go back to Home</Link>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/archive">View Blog Archives</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
};

export default NotFound;
