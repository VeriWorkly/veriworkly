import type { Metadata } from "next";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DocsBody } from "fumadocs-ui/layouts/notebook/page";
import { ArrowLeft, Clock, Calendar, ArrowRight, RefreshCw } from "lucide-react";

import { blog } from "@/lib/source";
import { feedAlternates, siteConfig } from "@/config/site";
import { getPostStats } from "@/lib/read-time";
import { getRelatedPosts } from "@/lib/related";

import PostActions from "@/components/blog/PostActions";
import PostFaq from "@/components/blog/PostFaq";
import PostToc from "@/components/blog/PostToc";
import RelatedPosts from "@/components/blog/RelatedPosts";

import { getMDXComponents } from "@/components/mdx";

import { Container } from "@/components/layout/Container";
import { buildPostSchema, serializeSchema } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Built once per post by `app/og/[slug]/image.png/route.tsx`. */
const ogImageFor = (slug: string) => `${siteConfig.url}/og/${slug}/image.png`;

export const dynamicParams = false;

export default async function BlogPostPage(props: PageProps) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  const MDX = page.data.body;
  const postUrl = `${siteConfig.url}/${params.slug}`;
  const { faq, tags, category, cluster, updated, date, title, description, author } = page.data;

  const stats = getPostStats(page.data.info.path);
  const related = getRelatedPosts({ url: page.url, cluster, tags });

  const schema = buildPostSchema({
    title,
    description,
    author,
    date,
    updated,
    category,
    tags,
    faq,
    url: postUrl,
    imageUrl: ogImageFor(params.slug),
    wordCount: stats.words,
  });

  return (
    <div className="min-h-screen py-12 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }}
      />

      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-16">
          {/* `article`, not `main` — MainLayout already provides the page's single
              main landmark, and two of them is invalid and confuses screen readers. */}
          <article className="space-y-10 lg:col-span-3">
            <header className="space-y-6">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase transition-colors"
              >
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />{" "}
                Back to Blog
              </Link>

              <div className="space-y-4">
                <div className="border-border/60 bg-muted/50 text-foreground w-fit rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase shadow-2xs">
                  {category}
                </div>

                <h1 className="text-foreground text-3xl leading-[1.14] font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                  {title}
                </h1>

                <p className="text-muted-foreground max-w-3xl text-lg leading-relaxed font-normal md:text-xl">
                  {description}
                </p>
              </div>
            </header>

            <div className="bg-border/50 h-px" />

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <DocsBody
                className={cn(
                  "text-foreground/90 max-w-none leading-relaxed font-normal",
                  // Headings - bold, crisp, properly spaced, with subtle top border on h2
                  "[&_h1]:text-foreground [&_h1]:mt-12 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:md:text-4xl",
                  "[&_h2]:border-border/40 [&_h2]:text-foreground [&_h2]:mt-14 [&_h2]:mb-5 [&_h2]:border-t [&_h2]:pt-6 [&_h2]:text-2xl [&_h2]:leading-snug [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:md:text-3xl",
                  "[&_h3]:text-foreground [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:leading-snug [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:md:text-2xl",
                  "[&_h4]:text-foreground [&_h4]:mt-8 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-bold",
                  // Heading Anchors - prevent heading text or icon links from turning blue or underlined
                  "[&_h1_a]:text-foreground [&_h1_a]:font-bold [&_h1_a]:no-underline",
                  "[&_h2_a]:text-foreground hover:[&_h2_a]:text-foreground [&_h2_a]:font-bold [&_h2_a]:no-underline",
                  "[&_h3_a]:text-foreground hover:[&_h3_a]:text-foreground [&_h3_a]:font-bold [&_h3_a]:no-underline",
                  "[&_h4_a]:text-foreground hover:[&_h4_a]:text-foreground [&_h4_a]:font-bold [&_h4_a]:no-underline",
                  "[&_a.subheading-anchor]:text-muted-foreground/30 hover:[&_a.subheading-anchor]:text-foreground [&_a.subheading-anchor]:font-normal [&_a.subheading-anchor]:no-underline",
                  // Body Links - sleek, professional underline, high contrast in light & dark mode, zero electric blue!
                  "[&_a]:text-foreground [&_a]:decoration-foreground/30 hover:[&_a]:decoration-foreground hover:[&_a]:text-foreground [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-[4px] [&_a]:transition-colors",
                  // Paragraphs & Text Formatting
                  "[&_p]:text-foreground/90 [&_p]:my-6 [&_p]:text-base [&_p]:leading-relaxed md:[&_p]:text-lg md:[&_p]:leading-8",
                  "[&_strong]:text-foreground [&_strong]:font-semibold",
                  // Lists
                  "[&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6",
                  "[&_li]:text-foreground/90 [&_li]:my-2 [&_li]:leading-relaxed",
                  // Blockquotes - subtle accent bar & elegant editorial styling
                  "[&_blockquote]:border-foreground/30 [&_blockquote]:bg-muted/20 [&_blockquote]:text-foreground/85 [&_blockquote]:my-8 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-2 [&_blockquote]:px-6 [&_blockquote]:py-3 [&_blockquote]:font-normal [&_blockquote]:italic",
                  // Code & Pre
                  "[&_code]:bg-muted/50 [&_code]:border-border/40 [&_code]:text-foreground [&_code]:rounded-md [&_code]:border [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em]",
                  // Tables
                  "[&_table]:border-border/40 [&_table]:my-8 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:text-sm",
                  "[&_td]:border-border/30 [&_td]:text-foreground/90 [&_td]:border-t [&_td]:px-4 [&_td]:py-3 [&_td]:align-top",
                  "[&_th]:border-border/50 [&_th]:text-foreground [&_thead]:bg-muted/40 [&_th]:border-b [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold",
                )}
              >
                <MDX components={getMDXComponents()} />
              </DocsBody>
            </div>

            <PostFaq items={faq} />

            <RelatedPosts posts={related} />
          </article>

          {/* Sticky Metadata & Project Callout Sidebar */}
          <aside className="border-border/40 h-fit space-y-8 border-t pt-8 lg:sticky lg:top-24 lg:col-span-1 lg:border-t-0 lg:pt-0">
            {/* Publisher Block */}
            <div className="space-y-4">
              <div className="text-muted-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
                Author
              </div>
              <div className="flex items-center gap-3">
                <div className="border-border bg-card rounded-full border p-1">
                  <Image
                    width={32}
                    height={32}
                    alt="VeriWorkly Logo"
                    src="/veriworkly-logo.png"
                    className="rounded-full"
                  />
                </div>
                <div>
                  <p className="text-foreground text-sm leading-none font-bold">{author}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Career &amp; hiring research</p>
                </div>
              </div>
            </div>

            <div className="bg-border/40 h-px" />

            <div className="space-y-4">
              <div className="text-muted-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
                Details
              </div>

              <div className="text-muted-foreground space-y-3 text-sm font-medium">
                <div className="flex items-center gap-2.5">
                  <Calendar className="size-4 opacity-70" />
                  <span>Published {formatDate(date)}</span>
                </div>

                {updated && (
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="size-4 opacity-70" />
                    <span>Updated {formatDate(updated)}</span>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 opacity-70" />
                  <span>{stats.label}</span>
                </div>
              </div>
            </div>

            <div className="bg-border/40 h-px" />

            <PostToc toc={page.data.toc} />

            <div className="bg-border/40 h-px" />

            <div className="space-y-4">
              <div className="text-muted-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
                Actions
              </div>

              <PostActions title={page.data.title} url={postUrl} path={page.data.info.path} />
            </div>

            <div className="bg-border/40 h-px" />

            <div className="border-border/60 bg-card/60 space-y-4 rounded-2xl border p-5 shadow-xs">
              <h4 className="text-foreground text-sm font-bold">VeriWorkly Platform</h4>

              <p className="text-muted-foreground text-xs leading-relaxed">
                Build a professional, ATS-friendly resume for free. 100% open-source and
                privacy-first.
              </p>

              <Link
                href={siteConfig.links.app}
                className="text-foreground hover:text-muted-foreground group inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors"
              >
                Launch Builder{" "}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </aside>
        </div>
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

  const { title, description, author, date, updated, tags } = page.data;

  const ogUrl = ogImageFor(params.slug);
  const postUrl = `${siteConfig.url}/${params.slug}`;

  return {
    title,
    description,

    authors: [{ name: author }],
    creator: siteConfig.creator,
    publisher: siteConfig.shortName,

    ...(tags.length > 0 && { keywords: tags }),

    alternates: {
      canonical: postUrl,
      types: feedAlternates,
    },

    openGraph: {
      title,
      description,
      type: "article",
      url: postUrl,
      publishedTime: new Date(date).toISOString(),
      modifiedTime: new Date(updated ?? date).toISOString(),
      authors: [author],
      tags: [...tags],
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: title || siteConfig.name,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title,
      description,
      images: [ogUrl],
    },
  };
}
