"use client";

import { useState } from "react";
import { CloudOff } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@veriworkly/ui";

import { portfolioWorkspaceUrl } from "@/config/site";
import { isPortfolioPubliclyVisible } from "@/lib/portfolio-status";
import { usePortfolioStore } from "@/store/portfolio-store";

/** Takes the public site offline after a confirmation. Renders nothing unless it is online. */
export function UnpublishButton({ className }: { className: string }) {
  const publication = usePortfolioStore((state) => state.publication);
  const unpublish = usePortfolioStore((state) => state.unpublish);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!publication || !isPortfolioPubliclyVisible(publication.status)) return null;

  const confirm = async () => {
    setPending(true);
    const result = await unpublish();
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setOpen(false);
    toast.success(result.message);
  };

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} type="button">
        <CloudOff size={13} aria-hidden="true" /> Unpublish
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)}>
        <Modal.Content className="workspace-theme bg-panel border-line text-ink">
          <Modal.Header>
            <Modal.Title>Take your site offline?</Modal.Title>
            <Modal.Description className="text-muted">
              {portfolioWorkspaceUrl(publication.subdomain).display} will stop working for visitors.
              Your draft is kept, and you can publish again at any time.
            </Modal.Description>
          </Modal.Header>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="border-line bg-panel text-ink inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-extrabold"
              onClick={() => setOpen(false)}
              disabled={pending}
              type="button"
            >
              Keep it online
            </button>
            <button
              className="bg-danger inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold text-white disabled:opacity-60"
              onClick={() => void confirm()}
              disabled={pending}
              type="button"
            >
              {pending ? "Unpublishing..." : "Unpublish"}
            </button>
          </div>
        </Modal.Content>
      </Modal>
    </>
  );
}
