import type { Metadata } from "next";

import {
  DocsBody,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
  DocsDescription,
} from "fumadocs-ui/layouts/notebook/page";
import { notFound } from "next/navigation";
import { createRelativeLink } from "fumadocs-ui/mdx";

import { source, ogImagePath } from "@/lib/source";
import { pageMetadata } from "@/lib/metadata";
import { contentEditUrl } from "@/lib/edit-links";
import { docPageSchema } from "@/lib/structured-data";

import { JsonLd } from "@/components/json-ld";
import { getMDXComponents } from "@/components/mdx";

export const dynamicParams = false;

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage
      tableOfContent={{
        style: "clerk",
        footer: <EditOnGitHub href={contentEditUrl("docs", page.path)} />,
      }}
      toc={page.data.toc}
      full={page.data.full}
    >
      <JsonLd
        data={docPageSchema({
          page,
          tree: source.getPageTree(),
          section: { name: "Docs", url: "/docs" },
          image: ogImagePath("docs", page.slugs),
        })}
      />

      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>

      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;

  const page = source.getPage(params.slug);

  if (!page) notFound();

  return pageMetadata({
    title: page.data.title,
    metaTitle: page.data.metaTitle,
    description: page.data.description,
    path: page.url,
    image: ogImagePath("docs", page.slugs),
  });
}
