import { DocsLayout as FumadocsDocsLayout } from "fumadocs-ui/layouts/notebook";

import { source } from "@/lib/source";

import { baseOptions, docsTabs } from "@/app/layout.config";

const DocsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <FumadocsDocsLayout tree={source.getPageTree()} {...baseOptions} tabs={docsTabs}>
      {children}
    </FumadocsDocsLayout>
  );
};

export default DocsLayout;
