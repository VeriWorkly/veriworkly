import type { Metadata } from "next";
import type { ComponentType } from "react";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { DocsBody } from "fumadocs-ui/layouts/notebook/page";

import { blog } from "@/lib/source";
import { siteConfig } from "@/config/site";

import PostActions from "@/components/blog/PostActions";

import { getMDXComponents } from "@/components/mdx";

import { Container } from "@/components/layout/Container";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage(props: PageProps) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  const MDX = page.data.body;
  const postUrl = `${siteConfig.url}/${params.slug}`;

  return (
    <div className="surface-grid min-h-screen py-10 md:py-16">
      <Container>
        <article className="border-border bg-card relative overflow-hidden rounded-4xl border px-6 py-8 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] md:px-14 md:py-14">
          <div className="bg-accent/5 pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full blur-3xl" />

          <nav className="relative mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="text-muted hover:text-foreground flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition"
            >
              <ArrowLeft className="size-4" /> Back to Blog
            </Link>

            <PostActions title={page.data.title} url={postUrl} path={page.data.info.path} />
          </nav>

          <header className="relative mb-12 space-y-6 md:mb-14">
            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-zinc-400">
              <div className="flex items-center gap-2">
                <Calendar className="size-4" />
                {new Date(page.data.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              <div className="flex items-center gap-2">
                <Clock className="size-4" />6 min read
              </div>

              <div className="bg-accent/10 text-accent rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase">
                Engineering
              </div>
            </div>

            <h1 className="text-foreground text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl md:text-6xl">
              {page.data.title}
            </h1>

            <p className="text-muted max-w-3xl text-lg leading-relaxed font-medium md:text-xl">
              {page.data.description}
            </p>

            <div className="flex items-center gap-4 pt-4">
              <div className="border-border rounded-full border p-1.5">
                <Image width={32} height={32} alt="VeriWorkly Logo" src="/veriworkly-logo.png" />
              </div>

              <div>
                <p className="text-foreground leading-none font-bold">VeriWorkly Team</p>
                <p className="text-muted mt-1 text-xs">Core Contributors</p>
              </div>
            </div>
          </header>

          <div className="border-border/60 bg-background/20 relative rounded-3xl border p-6 md:p-10">
            <DocsBody className="max-w-none [&_code]:rounded-md [&_code]:bg-zinc-500/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.92em] [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:font-semibold [&_li]:my-2 [&_p]:my-5 [&_p]:text-base [&_p]:leading-8 md:[&_p]:text-lg [&_ul]:my-4">
              <MDX components={getMDXComponents()} />
            </DocsBody>
          </div>

          <footer className="border-border mt-16 border-t pt-12 md:mt-20 md:pt-14">
            <div className="bg-accent/5 rounded-3xl p-8 md:p-10">
              <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
                <div className="bg-foreground/10 text-background flex size-20 shrink-0 items-center justify-center rounded-2xl font-bold shadow-2xl">
                  <Image width={48} height={48} alt="VeriWorkly Logo" src="/veriworkly-logo.png" />
                </div>

                <div className="space-y-4">
                  <h3 className="text-foreground text-2xl font-bold">Written by VeriWorkly</h3>

                  <p className="text-muted text-lg leading-relaxed">
                    We&apos;re on a mission to build the most private and professional career
                    engineering platform. Join us in redefining how professional stories are told.
                  </p>

                  <div className="flex flex-wrap justify-center gap-4 pt-2 md:justify-start md:gap-6">
                    <Link
                      href={siteConfig.links.app}
                      className="text-accent text-xs font-bold tracking-wider uppercase hover:underline"
                    >
                      Open resume builder
                    </Link>

                    <Link
                      href={siteConfig.links.docs}
                      className="text-accent text-xs font-bold tracking-wider uppercase hover:underline"
                    >
                      Read docs
                    </Link>

                    <Link
                      href={siteConfig.links.github}
                      className="text-accent text-xs font-bold tracking-wider uppercase hover:underline"
                    >
                      Follow our progress
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </article>
      </Container>
    </div>
  );
}

export function generateStaticParams() {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  const ogUrl = new URL(`${siteConfig.url}/api/og`);

  ogUrl.searchParams.set("title", page.data.title || siteConfig.name);
  ogUrl.searchParams.set("description", page.data.description || siteConfig.description);

  return {
    title: page.data.title,
    description: page.data.description,

    authors: [{ name: "VeriWorkly Team" }],
    creator: "Gautam Raj",
    publisher: "Gautam Raj",

    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: "article",
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: page.data.title || siteConfig.name,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
      images: [ogUrl.toString()],
    },
  };
}
