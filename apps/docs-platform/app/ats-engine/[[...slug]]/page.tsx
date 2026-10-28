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

import { engineSource, ogImagePath } from "@/lib/source";
import { pageMetadata } from "@/lib/metadata";
import { contentEditUrl } from "@/lib/edit-links";
import { docPageSchema } from "@/lib/structured-data";

import { JsonLd } from "@/components/json-ld";
import { getMDXComponents } from "@/components/mdx";

const GENERATED_PAGES = new Set([
  "reference/rubric.md",
  "reference/locales.md",
  "reference/check-options.mdx",
  "reference/report.mdx",
  "reference/ai-options.mdx",
  "project/changelog.md",
]);

const generatorUrl =
  "https://github.com/VeriWorkly/veriworkly/blob/master/apps/docs-platform/scripts/generate-engine-docs.mjs";

export const dynamicParams = false;

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = engineSource.getPage(params.slug);

  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage
      tableOfContent={{
        style: "clerk",
        footer: (
          <EditOnGitHub
            href={
              GENERATED_PAGES.has(page.path)
                ? generatorUrl
                : contentEditUrl("ats-engine", page.path)
            }
          />
        ),
      }}
      toc={page.data.toc}
      full={page.data.full}
    >
      <JsonLd
        data={docPageSchema({
          page,
          tree: engineSource.getPageTree(),
          section: { name: "ATS Engine", url: "/ats-engine" },
          image: ogImagePath("ats-engine", page.slugs),
        })}
      />

      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>

      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(engineSource, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return engineSource.generateParams();
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;

  const page = engineSource.getPage(params.slug);

  if (!page) notFound();

  return pageMetadata({
    title: page.data.title,
    metaTitle: page.data.metaTitle,
    description: page.data.description,
    path: page.url,
    image: ogImagePath("ats-engine", page.slugs),
  });
}
