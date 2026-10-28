import type { Metadata } from "next";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, FileText, Calendar } from "lucide-react";

import { blog } from "@/lib/source";
import { feedAlternates, siteConfig } from "@/config/site";
import { getReadingTime } from "@/lib/read-time";
import { formatDate } from "@/lib/format-date";
import { buildArchiveSchema, serializeSchema } from "@/lib/structured-data";

import { Container } from "@veriworkly/ui";

const title = "Blog Archive";
const description =
  "Browse the complete history of articles, tech logs, and career engineering advice from the VeriWorkly team.";
const url = `${siteConfig.url}/archive`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
    types: feedAlternates,
  },
  openGraph: {
    type: "website",
    url,
    title: `${title} | ${siteConfig.name}`,
    description,
    siteName: siteConfig.name,
    images: [{ url: "/og/blog-page-og.png", width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    title: `${title} | ${siteConfig.name}`,
    description,
    images: ["/og/blog-page-og.png"],
  },
};

const BlogArchive = () => {
  const allPosts = blog
    .getPages()
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  const schema = buildArchiveSchema({
    url,
    name: title,
    description,
    posts: allPosts.map((post) => ({
      url: `${siteConfig.url}${post.url}`,
      title: post.data.title,
    })),
  });

  return (
    <div className="min-h-screen py-14 md:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }}
      />

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

              <div className="border-accent/30 space-y-4 border-l-2 pl-4">
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

          {/* MainLayout supplies the page's single `main` landmark. */}
          <div className="space-y-10 lg:col-span-2">
            {allPosts.map((post) => {
              const meta = post.data;

              return (
                <article
                  key={post.url}
                  className="group border-border/40 relative space-y-4 border-b pb-10 last:border-0 last:pb-0"
                >
                  <div className="text-muted-foreground flex items-center gap-4 text-xs font-bold tracking-widest uppercase">
                    <span className="flex items-center gap-1.5">
                      <Calendar aria-hidden="true" className="size-3.5" />
                      <time dateTime={new Date(meta.date).toISOString()}>
                        {formatDate(meta.date)}
                      </time>
                    </span>

                    <span aria-hidden="true" className="bg-border size-1 rounded-full" />

                    <span className="flex items-center gap-1.5">
                      <Clock aria-hidden="true" className="size-3.5" />
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
                      aria-label={`Read ${meta.title}`}
                      className="text-accent inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-all duration-300 group-hover:gap-3"
                    >
                      Read Article
                      <ArrowRight aria-hidden="true" className="size-4" />
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
          </div>
        </div>
      </Container>
    </div>
  );
};

export default BlogArchive;
