import Link from "next/link";

import { Button, Container } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

const NotFound = () => {
  return (
    <main className="surface-grid flex min-h-screen items-center justify-center">
      <Container className="flex flex-col items-center text-center">
        <p className="text-accent text-sm font-bold tracking-[0.2em] uppercase">404 Error</p>

        <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          Page not found
        </h1>

        <p className="text-muted mt-6 max-w-md text-base leading-7">
          Sorry, we could not find the page you are looking for. It may have moved, or URL may be
          incorrect.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild variant="primary">
            <Link href="/">Go back to Dashboard</Link>
          </Button>

          {/* Studio has no `/templates` route; the gallery lives on the marketing site.
              Offering a 404 as the recovery action from a 404 is the worst version of a
              broken link. */}
          <Button asChild variant="ghost">
            <Link href={`${siteConfig.links.main}/templates`}>View Templates</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
};

export default NotFound;
