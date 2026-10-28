import type { Metadata } from "next";
import type { OpenAPIPageProps_Preloaded } from "fumadocs-openapi/ui";

import {
  DocsBody,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
  DocsDescription,
} from "fumadocs-ui/layouts/notebook/page";
import { notFound } from "next/navigation";

import { apiSource, ogImagePath } from "@/lib/source";
import { pageMetadata } from "@/lib/metadata";
import { apiEditUrl } from "@/lib/edit-links";
import { openapi } from "@/lib/openapi";

import { getMDXComponents } from "@/components/mdx";
import { OpenAPIPage } from "@/components/api-page";

export const dynamicParams = false;

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = apiSource.getPage(params.slug);

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

  const { preloaded } = await openapi.preloadOpenAPIPage(page);

  const components = getMDXComponents({
    OpenAPIPage: (props: Omit<OpenAPIPageProps_Preloaded, "preloaded">) => (
      <OpenAPIPage {...props} preloaded={preloaded} />
    ),
  });

  return (
    <DocsPage
      tableOfContent={{
        style: "clerk",
        footer: <EditOnGitHub href={apiEditUrl(page.path)} />,
      }}
      toc={pageData.toc}
      full={pageData.full}
    >
      <DocsTitle>{pageData.title}</DocsTitle>
      <DocsDescription>{pageData.description}</DocsDescription>

      <DocsBody>
        <MDX components={components} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return apiSource.generateParams();
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const page = apiSource.getPage(params.slug);

  if (!page) notFound();

  const pageData = page.data as unknown as {
    title: string;
    metaTitle?: string;
    description: string;
  };

  return pageMetadata({
    ...pageData,
    path: page.url,
    image: ogImagePath("api", page.slugs),
  });
}
