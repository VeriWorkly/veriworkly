"use client";

import * as React from "react";
import Link from "next/link";
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
  Download,
} from "lucide-react";

import { Modal, Button, Input } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import {
  clearLocalAccountData,
  downloadWorkspaceBackup,
} from "@/features/auth/services/current-user";
import { listDocuments } from "@/features/documents/services/document-workspace-service";
import { downloadAccountBackup } from "@/features/profile/services/account-backup";
import {
  type AffiliateForfeit,
  affiliateForfeitFrom,
  deleteAccount,
} from "@/features/profile/services/update-profile";
import { formatCents } from "@/features/admin/utils/admin-format";
import { releaseCheckoutBeforeDeletion } from "@/features/billing/billing-api";
import { ApiRequestError } from "@/utils/fetchApiData";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
}

const DeleteAccountModal = ({ open, onClose, userEmail }: DeleteAccountModalProps) => {
  const [confirmationInput, setConfirmationInput] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  // Why the full download was not made; the device-only copy is then offered instead.
  const [backupError, setBackupError] = React.useState<string | null>(null);
  // The unpaid affiliate balance the server said this deletion forfeits (409
  // AFFILIATE_BALANCE_FORFEIT); deleting again confirms exactly this amount.
  const [forfeit, setForfeit] = React.useState<AffiliateForfeit | null>(null);
  // The server refused because a checkout is still open (409 CHECKOUT_IN_PROGRESS). Nothing else
  // in the app cancels it, so the modal offers to (S-377).
  const [openCheckout, setOpenCheckout] = React.useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);

    if (open) {
      setConfirmationInput("");
      setError(null);
      setBackupError(null);
      setForfeit(null);
      setOpenCheckout(false);
      setIsDeleting(false);
    }
  }

  // Read once per opening, not on every keystroke of the confirmation: the modal mounts closed,
  // and the list must reflect the moment the user is about to delete.
  const deviceDocuments = React.useMemo(() => (open ? listDocuments() : []), [open]);
  const localOnlyCount = deviceDocuments.filter((item) => !item.sync.cloudDocumentId).length;

  const handleDownload = async () => {
    setDownloading(true);
    setBackupError(null);

    try {
      const backup = await downloadAccountBackup();
      if (!backup.ok) setBackupError(backup.message);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "Your data could not be downloaded.");
    } finally {
      setDownloading(false);
    }
  };

  const handleLocalDownload = () => {
    try {
      downloadWorkspaceBackup(deviceDocuments);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Your documents could not be downloaded.");
    }
  };

  const isConfirmed = confirmationInput.trim().toLowerCase() === userEmail.trim().toLowerCase();

  const runDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await deleteAccount(forfeit ? { confirmedForfeitCents: forfeit.amountCents } : {});

      toast.success(
        "Your account has been deleted. Billing records are kept only as long as tax law requires.",
      );

      // The account is gone, so this device must not keep its documents, outbox or
      // guest flag for the next person to inherit.
      clearLocalAccountData();
      window.location.href = siteConfig.links.main;
    } catch (err) {
      // Not a failure: the server wants the forfeit confirmed first, or, when the balance grew
      // since it was shown, confirmed again at the new amount.
      const owed = affiliateForfeitFrom(err);
      if (owed) {
        setForfeit(owed);
        setIsDeleting(false);
        return;
      }

      if (err instanceof ApiRequestError && err.code === "CHECKOUT_IN_PROGRESS") {
        setOpenCheckout(true);
        setIsDeleting(false);
        return;
      }

      const message = err instanceof Error ? err.message : "Failed to delete account";
      setError(message);
      toast.error(message);
      setIsDeleting(false);
    }
  };

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isConfirmed) {
      setError("Please type your exact email to confirm deletion.");
      return;
    }

    await runDelete();
  };

  const cancelCheckoutThenDelete = async () => {
    if (!isConfirmed) {
      setError("Please type your exact email to confirm deletion.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    const problem = await releaseCheckoutBeforeDeletion();
    if (problem) {
      setError(problem);
      setIsDeleting(false);
      return;
    }

    setOpenCheckout(false);
    await runDelete();
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
                  <strong className="text-foreground">Resumes & Documents:</strong> Every resume and
                  cover letter backed up to your account will be destroyed.
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
                  <code className="rounded bg-red-500/10 px-1 py-0.5 font-mono text-xs">
                    *.veriworkly.com
                  </code>
                  ) will be unpublished and all uploaded images deleted from cloud storage.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong className="text-foreground">Subscriptions &amp; Billing:</strong> A
                  subscription blocks deletion until it has ended, including one you have already
                  cancelled: cancel it from{" "}
                  <Link href="/billing" className="text-foreground underline">
                    Billing
                  </Link>{" "}
                  (Manage subscription) and delete your account once the paid period is over. We
                  cannot cancel it for you, because it lives with our payment provider. Billing
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

            <div className="border-border flex flex-col gap-3 rounded-xl border p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span>
                {deviceDocuments.length > 0 ? (
                  <>
                    <strong className="text-foreground">
                      {deviceDocuments.length} document{deviceDocuments.length === 1 ? "" : "s"} on
                      this device
                    </strong>
                    {localOnlyCount > 0
                      ? `, ${localOnlyCount} of them never saved to the cloud.`
                      : "."}{" "}
                    Deleting your account removes them from this device too.{" "}
                  </>
                ) : null}
                Download a copy first: one JSON file with every document in your account and your
                Master Profile. Restore a backup, on the empty Documents page or the first-run
                guide, restores the documents, and Profile, Advanced JSON, Import restores the
                Master Profile. For a PDF, open a document and download it.
              </span>

              <Button
                size="sm"
                type="button"
                variant="secondary"
                loading={downloading}
                disabled={isDeleting || downloading}
                onClick={() => void handleDownload()}
                className="shrink-0 text-xs font-semibold"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download my data
              </Button>
            </div>

            {backupError ? (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <strong className="text-foreground">No download was made.</strong> {backupError}
                  {deviceDocuments.length > 0
                    ? " You can still save the documents on this device; it will not include the rest of your account."
                    : null}
                </span>

                {deviceDocuments.length > 0 ? (
                  <Button
                    size="sm"
                    type="button"
                    variant="secondary"
                    disabled={isDeleting}
                    onClick={handleLocalDownload}
                    className="shrink-0 text-xs font-semibold"
                  >
                    Download local documents only
                  </Button>
                ) : null}
              </div>
            ) : null}

            {forfeit ? (
              <div
                role="alert"
                id="affiliate-forfeit-notice"
                className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs"
              >
                <p className="text-foreground font-semibold">
                  You have {formatCents(forfeit.amountCents, forfeit.currency)} in unpaid affiliate
                  commissions. Deleting your account forfeits it.
                </p>
                <p className="text-muted">
                  {formatCents(forfeit.availableCents, forfeit.currency)} available and{" "}
                  {formatCents(forfeit.pendingCents, forfeit.currency)} pending. To keep it, cancel
                  and request a payout first. To delete anyway, confirm below.
                </p>
              </div>
            ) : null}

            {openCheckout ? (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <strong className="text-foreground">A checkout you started is still open.</strong>{" "}
                  It could still be paid, so the account can&apos;t be deleted yet. If you
                  aren&apos;t paying for it, cancel it and the deletion goes ahead.
                </span>

                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  disabled={!isConfirmed || isDeleting}
                  onClick={() => void cancelCheckoutThenDelete()}
                  className="shrink-0 text-xs font-semibold"
                >
                  Cancel the open checkout
                </Button>
              </div>
            ) : null}

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
              {forfeit
                ? `Forfeit ${formatCents(forfeit.amountCents, forfeit.currency)} and delete`
                : "Permanently Delete Everything"}
            </Button>
          </div>
        </form>
      </Modal.Content>
    </Modal>
  );
};

export default DeleteAccountModal;
