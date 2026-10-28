import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DocsLayout as FumadocsDocsLayout } from "fumadocs-ui/layouts/notebook";

import { apiSource } from "@/lib/source";

import { baseOptions, docsTabs } from "@/app/layout.config";

// The section in every title keeps API pages distinct from same-named guides.
export const metadata: Metadata = {
  title: { default: "API Reference", template: "%s | VeriWorkly API" },
};

const APIReferenceLayout = ({ children }: { children: ReactNode }) => {
  const { nav, ...base } = baseOptions;

  return (
    <FumadocsDocsLayout tree={apiSource.getPageTree()} {...base} nav={{ ...nav }} tabs={docsTabs}>
      {children}
    </FumadocsDocsLayout>
  );
};

export default APIReferenceLayout;
