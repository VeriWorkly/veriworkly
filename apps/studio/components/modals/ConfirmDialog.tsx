"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Modal, Input, Button, cn } from "@veriworkly/ui";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "warning" | "destructive";
  loading?: boolean;
  /** When set, the confirm button stays disabled until this word is typed (case-insensitive). */
  confirmPhrase?: string;
  /** Headline of the warning box shown above the typed confirmation. */
  warningText?: string;
}

const toneConfig = {
  destructive: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "ring-red-500/10",
    border: "border-red-500/10",
    buttonClass: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-600/10 border-none",
  },

  warning: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/10",
    border: "border-amber-500/10",
    buttonClass:
      "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-600/10 border-none",
  },
};

/** Body copy for deleting a document, which differs once the server holds a copy. */
export function documentDeleteNotice(cloudBacked: boolean) {
  return cloudBacked
    ? "Deleted now; erased from our servers after 30 days."
    : "It is removed from this device and cannot be recovered.";
}

/**
 * Yes/no confirmation. With `confirmPhrase` it becomes the typed confirmation used for
 * irreversible deletes.
 */
const ConfirmDialog = (props: ConfirmDialogProps) => (
  <Modal open={props.open} onClose={props.onClose}>
    <ConfirmDialogContent {...props} />
  </Modal>
);

// Mounted only while open, so the typed phrase starts empty every time the dialog opens.
const ConfirmDialogContent = ({
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "warning",
  loading = false,
  confirmPhrase,
  warningText = "This action cannot be undone",
}: ConfirmDialogProps) => {
  const [typed, setTyped] = useState("");

  const config = toneConfig[tone];
  const Icon = confirmPhrase ? Trash2 : AlertTriangle;
  const phraseMatches =
    !confirmPhrase || typed.trim().toUpperCase() === confirmPhrase.toUpperCase();

  const handleConfirm = () => {
    if (!phraseMatches || loading) return;
    onConfirm();
  };

  return (
    <Modal.Content className="overflow-hidden p-0">
      <div className={cn("relative flex items-start gap-4 border-b p-4", config.border)}>
        <div
          className={cn(
            "ring-offset-background flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-4 ring-offset-2",
            config.bg,
            config.ring,
          )}
        >
          <Icon className={cn("h-4.5 w-4.5", config.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <Modal.Title className="text-foreground truncate text-base font-bold tracking-tight">
            {title}
          </Modal.Title>

          <p
            className={cn(
              "text-[9px] font-black tracking-widest uppercase opacity-80",
              config.color,
            )}
          >
            {confirmPhrase ? "Type to confirm" : "Please confirm"}
          </p>
        </div>
      </div>

      <Modal.Body className="space-y-6 p-5">
        {confirmPhrase ? (
          <>
            <div className="border-destructive/20 bg-destructive/5 flex gap-3 rounded-xl border p-4">
              <AlertTriangle className="text-destructive h-5 w-5 shrink-0" />

              <div className="space-y-1.5">
                <p className="text-destructive text-sm leading-none font-bold">{warningText}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="confirm-phrase-input"
                  className="text-muted-foreground/80 text-[10px] font-bold tracking-widest uppercase"
                >
                  Verification Required
                </label>

                <p className="text-muted-foreground text-[13px]">
                  To confirm, type{" "}
                  <span className="bg-destructive/10 text-destructive decoration-destructive/30 inline-flex items-center rounded px-0.5 py-0.5 font-mono text-xs font-bold underline underline-offset-2">
                    {confirmPhrase}
                  </span>{" "}
                  below.
                </p>
              </div>

              <Input
                id="confirm-phrase-input"
                autoFocus
                value={typed}
                inputSize="sm"
                variant="outline"
                onChange={(event) => setTyped(event.target.value)}
                placeholder={`Type ${confirmPhrase} to proceed`}
                className="border-border hover:border-destructive/30 focus-visible:border-destructive/50 focus-visible:ring-destructive/10 h-10 transition-all"
              />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-[13px] leading-relaxed font-medium">
            {description}
          </p>
        )}
      </Modal.Body>

      <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/50 p-4 sm:flex-row sm:justify-end sm:gap-3 dark:border-zinc-900 dark:bg-zinc-950/20">
        <Button
          size="sm"
          onClick={onClose}
          variant="secondary"
          className="w-full text-xs font-semibold tracking-wide sm:w-auto"
        >
          {cancelLabel}
        </Button>

        <Button
          size="sm"
          loading={loading}
          onClick={handleConfirm}
          disabled={!phraseMatches || loading}
          className={cn(
            "w-full px-6 text-xs font-semibold tracking-wide disabled:opacity-30 sm:w-auto",
            config.buttonClass,
          )}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal.Content>
  );
};

export default ConfirmDialog;
