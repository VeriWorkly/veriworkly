import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { blog } from "@/lib/source";
import { siteConfig } from "@/config/site";

import { Container, Card } from "@veriworkly/ui";

const BlogArchive = () => {
  const toBlogMeta = (data: unknown) =>
    data as {
      title: string;
      description: string;
      author: string;
      date: string;
    };

  const allPosts = blog
    .getPages()
    .sort(
      (a, b) =>
        new Date(toBlogMeta(b.data).date).getTime() - new Date(toBlogMeta(a.data).date).getTime(),
    );

  return (
    <main className="surface-grid min-h-screen py-14 md:py-20">
      <Container className="space-y-12">
        <header className="space-y-8">
          <Link
            href="/"
            className="text-muted hover:text-foreground flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition"
          >
            <ArrowLeft className="size-4" /> Back to Home
          </Link>

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <h1 className="text-foreground text-4xl font-bold tracking-tight md:text-6xl">
                The Archive.
              </h1>
              <p className="text-muted text-lg font-medium">
                Every story we&apos;ve told about the future of career engineering.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
              <Link href={siteConfig.links.app} className="text-accent hover:underline">
                Resume Builder
              </Link>
              <span className="text-muted">•</span>
              <Link href={siteConfig.links.docs} className="text-accent hover:underline">
                Documentation
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {allPosts.map((post) => {
            const meta = toBlogMeta(post.data);
            return (
              <Link key={post.url} href={post.url} className="group">
                <Card className="border-border/50 hover:border-accent/40 h-full transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 group-hover:-translate-y-2">
                  <div className="flex h-full flex-col p-8">
                    <div className="mb-6 flex items-center gap-3 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                      <span className="text-zinc-500">
                        {new Date(meta.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="size-1 rounded-full bg-zinc-200" />
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> 5m
                      </span>
                    </div>

                    <h3 className="text-foreground group-hover:text-accent mb-4 text-2xl leading-tight font-bold transition-colors">
                      {meta.title}
                    </h3>

                    <p className="text-muted mb-8 line-clamp-3 text-base leading-relaxed font-medium">
                      {meta.description}
                    </p>

                    <div className="mt-auto flex items-center gap-2 text-xs font-bold tracking-wider text-blue-600 uppercase transition-colors group-hover:text-blue-500">
                      Read More{" "}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {allPosts.length === 0 && (
          <div className="border-border/50 bg-card/50 flex flex-col items-center justify-center rounded-4xl border py-32 text-center">
            <p className="text-muted text-xl font-medium">No articles found.</p>
          </div>
        )}
      </Container>
    </main>
  );
};

export default BlogArchive;
