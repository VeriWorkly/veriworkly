import { FileText } from "lucide-react";

export function DocumentWorkspaceEmptyState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="bg-accent/10 text-accent flex h-14 w-14 items-center justify-center rounded-2xl">
        <FileText className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-bold">No documents yet</h2>

      <p className="text-muted mt-2 max-w-md text-sm leading-6">
        Use the sidebar create button to start a resume or cover letter.
      </p>
    </div>
  );
}
