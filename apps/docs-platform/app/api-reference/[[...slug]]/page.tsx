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
import { openapi, slicePreloaded } from "@/lib/openapi";
import { docPageSchema } from "@/lib/structured-data";

import { JsonLd } from "@/components/json-ld";
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

  const MDX = page.data.body;

  const { preloaded } = await openapi.preloadOpenAPIPage(page);

  const components = getMDXComponents({
    OpenAPIPage: (props: Omit<OpenAPIPageProps_Preloaded, "preloaded">) => (
      <OpenAPIPage {...props} preloaded={slicePreloaded(preloaded, props)} />
    ),
  });

  return (
    <DocsPage
      tableOfContent={{
        style: "clerk",
        footer: <EditOnGitHub href={apiEditUrl(page.path)} />,
      }}
      toc={page.data.toc}
      full={page.data.full}
    >
      <JsonLd
        data={docPageSchema({
          page,
          tree: apiSource.getPageTree(),
          section: { name: "API Reference", url: "/api-reference" },
          image: ogImagePath("api", page.slugs),
        })}
      />

      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>

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

  return pageMetadata({
    title: page.data.title,
    metaTitle: page.data.metaTitle,
    description: page.data.description,
    path: page.url,
    image: ogImagePath("api", page.slugs),
  });
}
