import Link from "next/link";
import { ArrowRight, Clock, Calendar } from "lucide-react";

import { Card } from "@veriworkly/ui";
import { getLatestBlogPosts } from "@/lib/blog-reader";

const BlogSection = () => {
  const latestPosts = getLatestBlogPosts();
  return (
    <section className="space-y-10" aria-labelledby="blog-heading">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-3">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Latest Insights
          </p>

          <h2
            id="blog-heading"
            className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Engineering stories & career advice
          </h2>

          <p className="text-muted max-w-2xl text-base leading-7">
            Deep dives into our technology stack, privacy-first engineering, and actionable advice
            to help you build a better career.
          </p>
        </div>

        <Link
          href="https://blog.veriworkly.com"
          className="text-accent hover:text-accent/80 flex items-center gap-2 text-sm font-bold transition-colors"
        >
          Explore All Articles <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {latestPosts.map((post) => (
          <Link key={post.title} href={post.href} className="group flex h-full">
            <Card className="border-border/50 bg-card/50 flex w-full flex-col p-8 transition-all duration-300 group-hover:-translate-y-2 group-hover:border-blue-500/30 group-hover:shadow-2xl group-hover:shadow-blue-500/5">
              <div className="mb-6 flex items-center gap-4 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> {post.date}
                </span>

                <span className="size-1 rounded-full bg-zinc-300" />

                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {post.readTime}
                </span>
              </div>

              <h3 className="text-foreground mb-4 line-clamp-2 text-2xl leading-tight font-bold transition-colors group-hover:text-blue-500">
                {post.title}
              </h3>

              <p className="text-muted mb-8 line-clamp-3 text-sm leading-relaxed font-medium">
                {post.description}
              </p>

              <div className="mt-auto flex items-center gap-2 text-xs font-bold tracking-widest text-blue-600 uppercase transition-colors group-hover:text-blue-500">
                Read Article{" "}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default BlogSection;
