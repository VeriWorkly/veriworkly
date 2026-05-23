import type { Metadata } from "next";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, FileText, Calendar } from "lucide-react";

import { blog } from "@/lib/source";
import { siteConfig } from "@/config/site";
import { getReadingTime } from "@/lib/read-time";

import { Container } from "@veriworkly/ui";

export const metadata: Metadata = {
  title: "Blog Archive | VeriWorkly",
  description:
    "Browse the complete history of articles, tech logs, and career engineering advice from the VeriWorkly team.",
  alternates: {
    canonical: `${siteConfig.url}/archive`,
  },
};

const BlogArchive = () => {
  const toBlogMeta = (data: unknown) =>
    data as {
      title: string;
      description: string;
      author: string;
      date: string;
      info: {
        path: string;
      };
    };

  const allPosts = blog
    .getPages()
    .sort(
      (a, b) =>
        new Date(toBlogMeta(b.data).date).getTime() - new Date(toBlogMeta(a.data).date).getTime(),
    );

  return (
    <div className="min-h-screen py-14 md:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
          <aside className="h-fit space-y-8 lg:sticky lg:top-14 lg:col-span-1">
            <div className="space-y-6">
              <Link
                href="/"
                className="text-muted hover:text-foreground inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-all duration-300"
              >
                <ArrowLeft className="size-4" /> Back to Home
              </Link>

              <div className="space-y-4 border-l-2 border-blue-500/20 pl-4">
                <h1 className="text-foreground text-4xl leading-tight font-bold tracking-tight md:text-5xl">
                  The Archive.
                </h1>

                <p className="text-muted text-base leading-relaxed font-medium">
                  Every story, case study, and engineering insight we&apos;ve shared about the
                  future of career technology.
                </p>
              </div>
            </div>

            <div className="border-border/60 bg-card/50 space-y-6 rounded-3xl border p-6">
              <div className="space-y-2">
                <div className="text-muted font-mono text-[10px] font-bold tracking-widest uppercase">
                  Archive Stats
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-foreground font-mono text-3xl font-bold tracking-tight tabular-nums">
                    {allPosts.length}
                  </span>

                  <span className="text-muted text-sm font-medium">Published posts</span>
                </div>
              </div>

              <div className="bg-border/40 h-px" />

              <div className="space-y-3">
                <div className="text-muted font-mono text-[10px] font-bold tracking-widest uppercase">
                  Quick Links
                </div>

                <div className="flex flex-col gap-2.5 text-sm font-semibold">
                  <Link
                    href={siteConfig.links.app}
                    className="text-accent flex items-center gap-1.5 hover:underline"
                  >
                    Resume Builder <ArrowRight className="size-3.5" />
                  </Link>

                  <Link
                    href={siteConfig.links.docs}
                    className="text-accent flex items-center gap-1.5 hover:underline"
                  >
                    Documentation <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-10 lg:col-span-2">
            {allPosts.map((post) => {
              const meta = toBlogMeta(post.data);

              return (
                <article
                  key={post.url}
                  className="group border-border/40 relative space-y-4 border-b pb-10 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4 text-xs font-bold tracking-widest text-zinc-400 uppercase">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-zinc-400" />
                      {new Date(meta.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>

                    <span className="size-1 rounded-full bg-zinc-300" />

                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-zinc-400" />
                      {getReadingTime(meta.info.path)}
                    </span>
                  </div>

                  <h2 className="text-foreground group-hover:text-accent text-2xl leading-snug font-bold tracking-tight transition-colors duration-300 md:text-3xl">
                    <Link href={post.url}>{meta.title}</Link>
                  </h2>

                  <p className="text-muted line-clamp-3 text-base leading-relaxed font-medium">
                    {meta.description}
                  </p>

                  <div className="pt-2">
                    <Link
                      href={post.url}
                      className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-blue-600 uppercase transition-all duration-300 group-hover:gap-3 group-hover:text-blue-500"
                    >
                      Read Article
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </article>
              );
            })}

            {allPosts.length === 0 && (
              <div className="border-border/50 bg-card/30 flex flex-col items-center justify-center rounded-3xl border py-24 text-center">
                <FileText className="text-muted mb-4 size-10 stroke-1" />

                <p className="text-muted text-lg font-medium">No articles published yet.</p>
              </div>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
};

export default BlogArchive;
