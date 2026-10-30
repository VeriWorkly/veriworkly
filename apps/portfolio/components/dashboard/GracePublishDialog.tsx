"use client";

import { Modal } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

/** Asks before a publish in GRACE puts the site on the free plan (`publishEndsGrace`). */
export function GracePublishDialog({
  open,
  onClose,
  onPublish,
}: {
  open: boolean;
  onClose: () => void;
  onPublish: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="workspace-theme bg-panel border-line text-ink">
        <Modal.Header>
          <Modal.Title>Publish on the free plan?</Modal.Title>
          <Modal.Description className="text-muted">
            Your plan has ended. Publishing now uses the free plan: the badge comes back, and
            Nimbus, Cipher, SEO controls and extra pages turn off. Renew first to keep them.
          </Modal.Description>
        </Modal.Header>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="border-line bg-panel text-ink inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-extrabold"
            onClick={() => {
              onClose();
              onPublish();
            }}
            type="button"
          >
            Publish anyway
          </button>
          <a
            className="bg-accent inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-extrabold text-(--color-accent-ink)"
            href={`${siteConfig.links.app}/billing`}
          >
            Renew
          </a>
        </div>
      </Modal.Content>
    </Modal>
  );
}
