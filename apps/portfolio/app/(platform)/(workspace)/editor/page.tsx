import type { Metadata } from "next";
import { PortfolioEditorWorkspace } from "@/components/dashboard/editor/PortfolioEditorWorkspace";

export const metadata: Metadata = { title: "Editor", robots: { index: false, follow: false } };

export default function EditorPage() {
  return <PortfolioEditorWorkspace />;
}
