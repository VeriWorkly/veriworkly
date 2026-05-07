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

import { source, getPageImage } from "@/lib/source";

import { getMDXComponents } from "@/components/mdx";

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
        footer: (
          <EditOnGitHub
            href={`https://github.com/Gautam25Raj/veriworkly-resume/edit/master/apps/docs-platform/content/docs/${page.slugs.join("/") + ".mdx"}`}
          />
        ),
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
    description: string;
  };

  return {
    title: pageData.title,
    description: pageData.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
