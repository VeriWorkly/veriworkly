import type { Metadata } from "next";

import DocumentsWorkspace from "./workspace";

export const metadata: Metadata = {
  title: "Documents",
  description: "Your resumes and cover letters.",
  robots: { index: false, follow: false },
};

export default function DocumentsPage() {
  return <DocumentsWorkspace />;
}
