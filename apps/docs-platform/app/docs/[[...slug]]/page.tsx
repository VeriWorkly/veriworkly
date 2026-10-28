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

import { getMDXComponents } from "@/components/mdx";

export const dynamicParams = false;

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();

  const pageData = page.data as unknown as {
    title: string;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toc: any[];
    full?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
  };

  const MDX = pageData.body;

  return (
    <DocsPage
      tableOfContent={{
        style: "clerk",
        footer: <EditOnGitHub href={contentEditUrl("docs", page.path)} />,
      }}
      toc={pageData.toc}
      full={pageData.full}
    >
      <DocsTitle>{pageData.title}</DocsTitle>
      <DocsDescription>{pageData.description}</DocsDescription>

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

  const pageData = page.data as unknown as {
    title: string;
    metaTitle?: string;
    description: string;
  };

  return pageMetadata({
    ...pageData,
    path: page.url,
    image: ogImagePath("docs", page.slugs),
  });
}
