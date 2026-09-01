"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@veriworkly/ui";
import DeleteAccountModal from "./DeleteAccountModal";

export function DangerZoneCard({ userEmail }: { userEmail?: string | null }) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  if (!userEmail) return null;

  return (
    <>
      <section
        className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 shadow-xs transition-all"
        aria-labelledby="danger-zone-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2
                id="danger-zone-title"
                className="text-sm font-bold text-red-600 dark:text-red-400"
              >
                Danger Zone
              </h2>
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Permanently delete your account, documents, master profile, portfolios, and all
              associated cloud data.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            id="open-delete-account-modal-btn"
            className="shrink-0 bg-red-600 text-xs font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98]"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete Account
          </Button>
        </div>
      </section>

      <DeleteAccountModal
        open={isModalOpen}
        userEmail={userEmail}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

export default DangerZoneCard;
