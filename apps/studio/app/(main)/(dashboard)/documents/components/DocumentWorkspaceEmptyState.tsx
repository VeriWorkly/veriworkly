import { FileText } from "lucide-react";

export function DocumentWorkspaceEmptyState({ activeTab }: { activeTab: "recent" | "shared" }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="bg-accent/10 text-accent flex h-14 w-14 items-center justify-center rounded-2xl">
        <FileText className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-bold">
        {activeTab === "shared" ? "No shared documents yet" : "No documents yet"}
      </h2>

      <p className="text-muted mt-2 max-w-md text-sm leading-6">
        {activeTab === "shared"
          ? "Shared documents appear here after they have a cloud-backed share link."
          : "Use the sidebar create button to start a resume, cover letter, formal letter, or invoice."}
      </p>
    </div>
  );
}
