import type { AdvancedIndex } from "fumadocs-core/search/server";
import type { StructuredData } from "fumadocs-core/mdx-plugins";

import { createSearchAPI } from "fumadocs-core/search/server";

import { source, apiSource, engineSource } from "@/lib/source";

type IndexedPage = {
  url: string;
  data: { title: string; description?: string; structuredData: StructuredData };
};

function toIndex(page: IndexedPage, breadcrumbs: string[]): AdvancedIndex {
  return {
    id: page.url,
    url: page.url,
    title: page.data.title,
    description: page.data.description,
    breadcrumbs,
    structuredData: page.data.structuredData,
  };
}

export const { GET } = createSearchAPI("advanced", {
  language: "english",
  indexes: () => [
    ...source.getPages().map((page) => toIndex(page, ["Docs"])),
    ...engineSource.getPages().map((page) => toIndex(page, ["ATS Engine"])),
    ...apiSource.getPages().map((page) => toIndex(page, ["API Reference"])),
  ],
});
