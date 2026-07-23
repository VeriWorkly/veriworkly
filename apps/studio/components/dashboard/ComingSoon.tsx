import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@veriworkly/ui";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <section className="border-border bg-card mx-auto max-w-lg rounded-2xl border p-8 text-center">
        <span className="bg-accent/10 text-accent mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-black">{title}</h1>
        <p className="text-muted mt-3 text-sm leading-6">{description}</p>
        <Button asChild className="mt-6">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
