import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { Button, Card } from "@veriworkly/ui";
import { getReadingTime } from "@/lib/read-time";

interface Post {
  url: string;
  data: {
    title: string;
    description: string;
    date: string | Date;
    info: {
      path: string;
    };
  };
}

interface PostsGridProps {
  posts: Post[];
}

export const PostsGrid = ({ posts }: PostsGridProps) => {
  return (
    <section id="posts" className="space-y-12">
      <div className="flex items-end justify-between pb-6">
        <div className="space-y-2">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Archive</p>
          <h2 className="text-foreground text-3xl font-semibold tracking-tight">Latest Articles</h2>
          <p className="text-muted font-medium">
            Fresh perspectives on modern work and technology.
          </p>
        </div>

        <Link
          href="/archive"
          className="text-accent hidden text-sm font-bold hover:underline md:block"
        >
          See all posts
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const meta = post.data;

          return (
            <Link key={post.url} href={post.url} className="group">
              <Card className="border-border/50 hover:border-accent/40 h-full transition-all duration-500 group-hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/5">
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
                      <Clock className="size-3" /> {getReadingTime(meta.info.path)}
                    </span>
                  </div>

                  <h3 className="text-foreground group-hover:text-accent mb-4 text-xl font-semibold tracking-tight transition-colors">
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

      <div className="flex justify-center pt-12 md:hidden">
        <Button asChild variant="secondary" className="h-12 rounded-2xl border-zinc-200/50 px-8">
          <Link href="/archive">View all articles</Link>
        </Button>
      </div>
    </section>
  );
};
