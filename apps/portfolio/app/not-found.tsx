import Link from "next/link";
import { ArrowLeft, Compass, EyeOff, LayoutGrid } from "lucide-react";

import { Button, Container } from "@veriworkly/ui";

const NotFoundPage = () => {
  return (
    <div className="bg-paper text-ink relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 select-none md:p-12">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-15" />
      <div className="bg-accent/5 pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full blur-3xl" />

      <Container className="relative w-full max-w-4xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <main className="border-line bg-panel flex min-h-[460px] flex-col justify-between rounded-4xl border-2 p-6 shadow-[8px_10px_0_rgba(17,17,15,0.03)] sm:p-8">
            <div>
              <div className="border-line bg-paper/30 relative flex h-48 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed sm:h-56">
                <EyeOff className="text-muted size-8 animate-pulse opacity-40" />

                <span className="text-muted mt-3 font-mono text-[10px] tracking-widest uppercase opacity-60">
                  MEDIA_NOT_RESOLVED
                </span>

                <div className="border-muted absolute top-2 left-2 size-2 border-t border-l opacity-30" />
                <div className="border-muted absolute top-2 right-2 size-2 border-t border-r opacity-30" />
                <div className="border-muted absolute bottom-2 left-2 size-2 border-b border-l opacity-30" />
                <div className="border-muted absolute right-2 bottom-2 size-2 border-r border-b opacity-30" />
              </div>

              <h1 className="text-ink mt-8 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                Project #404: The Missing Link
              </h1>

              <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed">
                The content path you requested cannot be rendered. Either the builder has not
                published this project yet, or the page address has been moved.
              </p>
            </div>

            <div className="border-line/60 mt-8 flex flex-wrap items-center gap-4 border-t pt-6">
              <Button
                asChild
                className="bg-accent hover:bg-accent-strong inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-xs font-bold tracking-wider text-white uppercase transition-transform active:scale-[0.97]"
              >
                <Link href="/">
                  <ArrowLeft className="size-4" /> Go Back Home
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                className="border-line text-ink hover:bg-paper-2 inline-flex min-h-12 items-center gap-2 rounded-full border px-6 text-xs font-bold tracking-wider uppercase transition-transform active:scale-[0.97]"
              >
                <Link href="/templates">
                  <LayoutGrid className="size-4" /> View Templates
                </Link>
              </Button>
            </div>
          </main>

          <aside className="border-line bg-panel/30 flex flex-col gap-6 rounded-4xl border-2 p-6 backdrop-blur">
            <div>
              <div className="text-muted text-[10px] font-bold tracking-widest uppercase">
                Metadata
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[10px] font-bold opacity-50">CLIENT</div>
                  <div className="text-ink mt-0.5 text-xs font-bold">Anonymous Guest</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold opacity-50">STATUS</div>
                  <div className="text-danger mt-0.5 flex items-center gap-1.5 text-xs font-bold">
                    <span className="bg-danger size-1.5 animate-ping rounded-full" />
                    404 Disconnected
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold opacity-50">RELEASE</div>
                  <div className="text-ink mt-0.5 text-xs font-bold">Build #v3.20.0</div>
                </div>
              </div>
            </div>

            <div className="border-line/60 mt-auto border-t pt-6">
              <div className="text-accent flex items-center gap-2 text-xs font-bold">
                <Compass className="size-4 animate-spin opacity-60" />
                <span>Lost your way?</span>
              </div>

              <p className="text-muted mt-2 text-[11px] leading-relaxed">
                If you are looking for your dashboard, make sure you are logged in to the studio
                app.
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
};

export default NotFoundPage;
