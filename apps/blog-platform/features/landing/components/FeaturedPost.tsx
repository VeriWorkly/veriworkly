import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { Card } from "@veriworkly/ui";
import { getReadingTime } from "@/lib/read-time";

interface FeaturedPostProps {
  post: {
    url: string;
    data: {
      title: string;
      description: string;
      author: string;
      date: string | Date;
      info: {
        path: string;
      };
    };
  };
}

export const FeaturedPost = ({ post }: FeaturedPostProps) => {
  const meta = post.data;

  return (
    <section className="space-y-12">
      <div className="flex items-end justify-between pb-6">
        <div className="space-y-2">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Spotlight</p>

          <h2 className="text-foreground text-3xl font-semibold tracking-tight">
            Featured Article
          </h2>

          <p className="text-muted font-medium">Our latest deep dive into career engineering.</p>
        </div>

        <div className="hidden md:block">
          <Link href="/archive" className="text-accent text-sm font-bold hover:underline">
            View archive
          </Link>
        </div>
      </div>

      <Link href={post.url} className="group block">
        <Card className="border-border/50 hover:border-accent/40 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5">
          <div className="grid lg:grid-cols-2">
            <div className="relative aspect-video overflow-hidden bg-zinc-100 lg:aspect-auto dark:bg-zinc-900">
              <div className="from-accent/20 absolute inset-0 bg-linear-to-br to-transparent" />

              <div className="absolute inset-0 flex items-center justify-center p-12">
                <div className="space-y-4 text-center transition-transform duration-500 group-hover:scale-105">
                  <div className="text-foreground text-4xl font-black tracking-tighter opacity-10 select-none lg:text-6xl">
                    VERIWORKLY
                  </div>

                  <div className="text-accent font-mono text-sm tracking-widest uppercase">
                    Case Study
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-6 p-8 md:p-12">
              <div className="flex items-center gap-4 text-xs font-bold tracking-widest text-zinc-400 uppercase">
                <span>
                  {new Date(meta.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>

                <span className="size-1 rounded-full bg-zinc-300" />

                <span className="flex items-center gap-1">
                  <Clock className="size-3" /> {getReadingTime(meta.info.path)}
                </span>
              </div>

              <h3 className="text-foreground group-hover:text-accent text-3xl leading-tight font-semibold tracking-tight transition-colors md:text-5xl">
                {meta.title}
              </h3>

              <p className="text-muted line-clamp-3 text-lg leading-relaxed font-medium">
                {meta.description}
              </p>

              <div className="pt-4">
                <span className="inline-flex items-center gap-2 text-sm font-bold tracking-wider text-blue-600 uppercase">
                  Read full article
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-2" />
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </section>
  );
};
