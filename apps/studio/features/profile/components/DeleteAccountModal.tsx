"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  FileText,
  User,
  Globe,
  CreditCard,
  Coins,
  Trophy,
  KeyRound,
  Trash2,
} from "lucide-react";

import { Modal, Button, Input } from "@veriworkly/ui";

import { deleteAccount } from "@/features/profile/services/update-profile";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
}

export const DeleteAccountModal = ({ open, onClose, userEmail }: DeleteAccountModalProps) => {
  const [confirmationInput, setConfirmationInput] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);

    if (open) {
      setConfirmationInput("");
      setError(null);
      setIsDeleting(false);
    }
  }

  const isConfirmed = confirmationInput.trim().toLowerCase() === userEmail.trim().toLowerCase();

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isConfirmed) {
      setError("Please type your exact email to confirm deletion.");
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      await deleteAccount();

      toast.success("Your account and all associated data have been permanently deleted.");

      // Wipe local storage caches
      if (typeof window !== "undefined") {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {
          // Ignore storage access errors
        }

        // Redirect to marketing site
        window.location.href = "https://veriworkly.com";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete account";
      setError(message);
      toast.error(message);
      setIsDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={isDeleting ? () => {} : onClose}>
      <Modal.Content className="max-w-xl overflow-hidden p-0">
        <div className="relative flex items-center gap-4 border-b border-red-500/20 bg-red-500/5 p-5">
          <div className="pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full bg-red-500/10 opacity-15 blur-2xl" />

          <div className="ring-offset-background flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500 ring-3 ring-red-500/20 ring-offset-2">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div>
            <Modal.Title
              id="delete-account-title"
              className="text-lg font-black text-red-600 dark:text-red-400"
            >
              Delete Account & Destroy All Data
            </Modal.Title>

            <p className="text-muted text-xs font-medium">
              This action is permanent and cannot be undone
            </p>
          </div>
        </div>

        <form onSubmit={handleDelete}>
          <Modal.Body className="space-y-4 p-5">
            <p className="text-foreground text-sm font-medium">
              Deleting your account will permanently purge your data across our entire system:
            </p>

            <div className="space-y-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs">
              <div className="flex items-start gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong className="text-foreground">Resumes & Documents:</strong> All cloud-synced
                  resumes, cover letters, and version histories will be destroyed.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong className="text-foreground">Master Profile:</strong> All canonical work
                  history, skills, projects, and education data will be erased.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong className="text-foreground">Portfolios & Media:</strong> Published
                  subdomains (
                  <code className="rounded bg-red-500/10 px-1 py-0.5 font-mono text-[11px]">
                    *.veriworkly.com
                  </code>
                  ) will be unpublished and all uploaded images deleted from cloud storage.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong className="text-foreground">Subscriptions &amp; Billing:</strong> Cancel
                  any active subscription <em>first</em> — we cannot cancel it for you, because it
                  lives with our payment provider, so deletion is blocked until you have. Billing
                  records are kept as long as tax law requires.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <Coins className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong className="text-foreground">AI Credits & Wallet:</strong> Remaining AI
                  credits, purchased credit packs, and grants will be permanently lost without
                  refund.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong className="text-foreground">Affiliate & Ambassador:</strong> Referral
                  codes, pending commissions, and ambassador profile status will be wiped.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong className="text-foreground">Developer Access:</strong> All generated API
                  keys and tokens will be permanently revoked.
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label
                htmlFor="confirm-email-input"
                className="text-foreground text-xs font-semibold"
              >
                To confirm permanent deletion, please type your email{" "}
                <span className="font-mono font-bold text-red-600 select-all dark:text-red-400">
                  {userEmail}
                </span>
                :
              </label>

              <Input
                autoFocus
                type="email"
                value={confirmationInput}
                error={!!error}
                className="w-full font-mono text-sm"
                disabled={isDeleting}
                id="confirm-email-input"
                placeholder={userEmail}
                onChange={(e) => {
                  setConfirmationInput(e.target.value);
                  setError(null);
                }}
              />

              {error && (
                <p
                  id="delete-account-error"
                  className="text-destructive pl-1 text-xs font-semibold"
                >
                  {error}
                </p>
              )}
            </div>
          </Modal.Body>

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/50 p-4 sm:flex-row sm:justify-end sm:gap-3 dark:border-zinc-900 dark:bg-zinc-950/20">
            <Button
              size="sm"
              onClick={onClose}
              variant="secondary"
              disabled={isDeleting}
              id="cancel-delete-account-btn"
              className="w-full text-xs font-semibold sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              type="submit"
              loading={isDeleting}
              disabled={!isConfirmed || isDeleting}
              id="confirm-delete-account-btn"
              className="w-full bg-red-600 text-xs font-bold text-white transition-all hover:bg-red-700 disabled:opacity-40 sm:w-auto"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Permanently Delete Everything
            </Button>
          </div>
        </form>
      </Modal.Content>
    </Modal>
  );
};

export default DeleteAccountModal;
