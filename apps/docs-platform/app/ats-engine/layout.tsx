import type { Metadata } from "next";

import { DocsLayout as FumadocsDocsLayout } from "fumadocs-ui/layouts/notebook";

import { engineSource } from "@/lib/source";

import { baseOptions, docsTabs } from "@/app/layout.config";

// The section in every title keeps engine pages distinct from same-named guides.
export const metadata: Metadata = {
  title: { default: "ATS Engine", template: "%s | VeriWorkly ATS Engine" },
};

const EngineDocsLayout = ({ children }: { children: React.ReactNode }) => {
  const { nav, ...base } = baseOptions;

  return (
    <FumadocsDocsLayout
      tree={engineSource.getPageTree()}
      {...base}
      tabs={docsTabs}
      nav={{ ...nav }}
    >
      {children}
    </FumadocsDocsLayout>
  );
};

export default EngineDocsLayout;
