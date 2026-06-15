"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Modal, Button, Input } from "@veriworkly/ui";

import { updateAccountName } from "@/features/profile/services/update-profile";

interface EditProfileNameModalProps {
  open: boolean;
  onClose: () => void;
  currentName: string;
}

const EditProfileNameModal = ({ open, onClose, currentName }: EditProfileNameModalProps) => {
  const router = useRouter();

  const [name, setName] = React.useState(currentName);
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);

    if (open) {
      setName(currentName);
      setError(null);
      setIsSaving(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Name cannot be empty");
      return;
    }

    if (trimmedName.length > 255) {
      setError("Name is too long (maximum 255 characters)");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await updateAccountName(trimmedName);

      toast.success("Profile name updated successfully");
      router.refresh();

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update name";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="overflow-hidden p-0">
        <div className="relative flex items-center gap-4 border-b border-zinc-100 p-4 md:bg-zinc-500/2 dark:border-zinc-900">
          <div className="bg-accent/10 pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full opacity-10 blur-2xl" />

          <div className="ring-offset-background bg-accent/10 ring-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-3 ring-offset-2 transition-all duration-300">
            <UserRound className="text-accent h-4.5 w-4.5" />
          </div>

          <div>
            <Modal.Title id="edit-name-title" className="text-lg font-bold">
              Edit Display Name
            </Modal.Title>

            <p className="text-muted-foreground text-xs">Account settings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Modal.Body className="space-y-4 p-5">
            <div className="space-y-2">
              <label htmlFor="profile-name-input" className="text-foreground text-sm font-semibold">
                Display Name
              </label>

              <Input
                autoFocus
                type="text"
                value={name}
                error={!!error}
                className="w-full"
                disabled={isSaving}
                id="profile-name-input"
                placeholder="Enter your name"
                onChange={(e) => setName(e.target.value)}
              />

              {error && (
                <p id="profile-name-error" className="text-destructive pl-1 text-xs font-semibold">
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
              disabled={isSaving}
              id="cancel-edit-name-btn"
              className="w-full border-zinc-200 text-xs font-semibold tracking-wide transition-all duration-200 hover:bg-zinc-100 active:scale-[0.98] sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              type="submit"
              loading={isSaving}
              id="save-edit-name-btn"
              className="bg-accent text-accent-foreground w-full text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] sm:w-auto"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal.Content>
    </Modal>
  );
};

export default EditProfileNameModal;
