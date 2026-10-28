"use client";

import AdminActionDialog from "@/components/admin/AdminActionDialog";

import { deleteRoadmapFeature } from "@/features/roadmap/services/admin-roadmap";

/** The delete is audited with the admin's reason (V-081). */
export default function DeleteRoadmapButton({ id, title }: { id: string; title: string }) {
  return (
    <AdminActionDialog
      trigger="Delete"
      triggerVariant="ghost"
      triggerClassName="text-destructive h-7 text-xs"
      title="Delete this roadmap item"
      description={`"${title}" is removed from the public roadmap. This cannot be undone.`}
      confirmLabel="Delete item"
      onConfirm={async (reason) => {
        await deleteRoadmapFeature(id, reason);
      }}
    />
  );
}
