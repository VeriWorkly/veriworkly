"use client";

import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Modal, Input, Button } from "@veriworkly/ui";

interface DestructiveModalProps {
  open: boolean;
  onCloseAction: () => void;
  onConfirmAction: () => void;
  entityName?: string;
  title?: string;
  description?: string;
  confirmText?: string;
  warningText?: string;
  loading?: boolean;
}

const DestructiveModal = ({
  open,
  onCloseAction,
  onConfirmAction,
  entityName = "item",
  title,
  description,
  confirmText = "DELETE",
  warningText,
  loading = false,
}: DestructiveModalProps) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setValue(""), 300);

      return () => clearTimeout(timer);
    }
  }, [open]);

  const isValid = useMemo(
    () => value.trim().toUpperCase() === confirmText.toUpperCase(),
    [value, confirmText],
  );

  const handleConfirm = () => {
    if (!isValid || loading) return;
    onConfirmAction();
  };

  return (
    <Modal open={open} onClose={onCloseAction}>
      <Modal.Content className="overflow-hidden p-0">
        <div className="border-destructive/10 bg-destructive/5 flex items-center gap-3 border-b p-4 md:bg-red-50/50 dark:md:bg-red-950/10">
          <div className="bg-destructive/10 text-destructive flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-2 ring-red-500/10 ring-inset">
            <Trash2 className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <Modal.Title className="text-foreground truncate text-base font-semibold">
              {title ?? `Delete ${entityName}?`}
            </Modal.Title>

            <p className="text-destructive/80 text-[10px] font-medium tracking-widest uppercase">
              Irreversible Action
            </p>
          </div>
        </div>

        <Modal.Body className="space-y-6 p-4">
          <div className="border-destructive/20 bg-destructive/5 flex gap-3 rounded-xl border p-4">
            <AlertTriangle className="text-destructive h-5 w-5 shrink-0" />

            <div className="space-y-1.5">
              <p className="text-destructive text-sm leading-none font-bold">
                {warningText ?? "This action cannot be undone"}
              </p>

              <p className="text-muted-foreground text-xs leading-relaxed">
                {description ??
                  `You are about to permanently remove this ${entityName}. All associated data will be purged from our servers.`}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="verification-input"
                className="text-muted-foreground/80 text-[10px] font-bold tracking-widest uppercase"
              >
                Verification Required
              </label>

              <p className="text-muted-foreground text-[13px]">
                To confirm, type{" "}
                <span className="bg-destructive/10 text-destructive decoration-destructive/30 inline-flex items-center rounded px-0.5 py-0.5 font-mono text-xs font-bold underline underline-offset-2">
                  {confirmText}
                </span>{" "}
                below.
              </p>
            </div>

            <Input
              id="verification-input"
              autoFocus
              value={value}
              inputSize="sm"
              variant="outline"
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Type ${confirmText} to proceed`}
              className="border-border hover:border-destructive/30 focus-visible:border-destructive/50 focus-visible:ring-destructive/10 h-10 transition-all"
            />
          </div>
        </Modal.Body>

        <div className="flex flex-col-reverse gap-2 border-t bg-zinc-50/50 p-4 sm:flex-row sm:justify-end dark:bg-zinc-900/50">
          <Button
            size="sm"
            onClick={onCloseAction}
            variant="secondary"
            className="w-full text-xs sm:w-auto"
          >
            Keep {entityName}
          </Button>

          <Button
            size="sm"
            loading={loading}
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="w-full bg-red-500/80 px-6 text-xs font-semibold tracking-widest text-white uppercase shadow-lg shadow-red-600/20 hover:bg-red-600 disabled:opacity-30 sm:w-auto"
          >
            Confirm
          </Button>
        </div>
      </Modal.Content>
    </Modal>
  );
};

export default DestructiveModal;
