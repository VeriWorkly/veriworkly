import { Modal } from "@veriworkly/ui";

/** A delete waiting for confirmation: what to say, and what to do on yes. */
export type DeleteRequest = { title: string; detail: string; run: () => void } | null;

export interface ConfirmDeleteProps {
  request: DeleteRequest;
  onClose: () => void;
}

/** One confirmation for every delete in the editor: a page, a section or an item (P-040). */
export function ConfirmDelete({ request, onClose }: ConfirmDeleteProps) {
  return (
    <Modal open={Boolean(request)} onClose={onClose}>
      <Modal.Content className="workspace-theme bg-panel border-line text-ink">
        <Modal.Header>
          <Modal.Title>{request?.title}</Modal.Title>
          <Modal.Description className="text-muted">{request?.detail}</Modal.Description>
        </Modal.Header>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="border-line bg-panel text-ink inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-extrabold"
            onClick={onClose}
            type="button"
          >
            Keep it
          </button>
          <button
            className="bg-danger inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-extrabold text-white"
            onClick={() => {
              request?.run();
              onClose();
            }}
            type="button"
          >
            Delete
          </button>
        </div>
      </Modal.Content>
    </Modal>
  );
}
