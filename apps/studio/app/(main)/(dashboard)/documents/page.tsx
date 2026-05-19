import type { Metadata } from "next";

import DocumentsWorkspace from "./workspace";

export const metadata: Metadata = {
  title: "Resumes",
  description: "Manage saved resumes in one workspace.",
  robots: { index: false, follow: false },
};

export default function DocumentsPage() {
  return <DocumentsWorkspace />;
}
